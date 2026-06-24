pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol"; //sirve para recuperar qué dirección firmó un mensaje
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol"; //para construir mensajes firmables de forma estructurada
import "./UserRegistry.sol";

contract MedicalDocumentRegistry is Ownable, EIP712 {


    //define el tipo de dato que va a firmar el medico con EIP-712
    bytes32 private constant MEDICAL_DOCUMENT_TYPEHASH = keccak256(
        "MedicalDocument(address patient,bytes32 documentHash,string documentType,string offChainRef,address doctor)"
    );

    enum DocumentStatus {
        PATIENT_UPLOADED,
        VERIFIED_ISSUER_DOCUMENT,
        REVOKED
    }

    struct MedicalDocument {
        uint256 id;
        bytes32 documentHash;
        address patient;
        address issuer;
        string documentType;
        string offChainRef;     //referencia off-chain al documento guardado en la base de datos
        uint256 issuedAt;
        DocumentStatus status;
    }


    mapping(uint256 => MedicalDocument) private _documents; //guarda docs x id
    mapping(bytes32 => bool) private _hashExists;
    mapping(address => uint256[]) private _patientDocuments;
    uint256 private _nextDocumentId; //para asignar IDs a los documentos

    UserRegistry private immutable _userRegistry;

    //direccion autorizada a registrar documentos en nombre de un emisor (ej: PrescriptionManager)
    address private _authorizedCaller;


    event DocumentRegistered(
        uint256 indexed documentId,
        address indexed patient,
        address indexed issuer,
        DocumentStatus status
    );

    event DocumentRevoked(uint256 indexed documentId, address indexed revokedBy);
    event AuthorizedCallerSet(address indexed caller);


    constructor(address userRegistry) Ownable(msg.sender) EIP712("MedicalDocumentRegistry", "1") { //Inicializa el dominio EIP-712
        require(userRegistry != address(0), "MedicalDocumentRegistry: userRegistry invalido");
        _userRegistry = UserRegistry(userRegistry);
    }


    //admin autoriza a un contrato (ej: PrescriptionManager) a registrar documentos
    function setAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "MedicalDocumentRegistry: caller invalido");
        _authorizedCaller = caller;
        emit AuthorizedCallerSet(caller);
    }

    function getAuthorizedCaller() external view returns (address) {
        return _authorizedCaller;
    }


    //profesional verificado registra un documento medico para un paciente
    //consulta UserRegistry para confirmar que el emisor esta habilitado
    function registerDocument(
        address patient,
        bytes32 documentHash,
        string calldata documentType,
        string calldata offChainRef
    ) external returns (uint256) {
        require(
            _userRegistry.isVerifiedEmitter(msg.sender) || msg.sender == _authorizedCaller,
            "MedicalDocumentRegistry: emisor no verificado"
        );
        require(
            _userRegistry.isRegistered(patient),
            "MedicalDocumentRegistry: paciente no registrado"
        );
        require(documentHash != bytes32(0), "MedicalDocumentRegistry: hash invalido");
        require(!_hashExists[documentHash], "MedicalDocumentRegistry: hash ya registrado");

        uint256 documentId = _nextDocumentId++;

        _documents[documentId] = MedicalDocument({
            id: documentId,
            documentHash: documentHash,
            patient: patient,
            issuer: msg.sender,
            documentType: documentType,
            offChainRef: offChainRef,
            issuedAt: block.timestamp,
            status: DocumentStatus.VERIFIED_ISSUER_DOCUMENT
        });

        _hashExists[documentHash] = true;
        _patientDocuments[patient].push(documentId);

        emit DocumentRegistered(documentId, patient, msg.sender, DocumentStatus.VERIFIED_ISSUER_DOCUMENT);

        return documentId;
    }

    //Registra un documento firmado off-chain por un medico autorizado.
    function registerSignedDocument(
        address patient,
        bytes32 documentHash,
        string calldata documentType,
        string calldata offChainRef,
        address doctor,
        bytes calldata signature
    ) external returns (uint256) {
        require(patient != address(0), "MedicalDocumentRegistry: paciente invalido");
        require(doctor != address(0), "MedicalDocumentRegistry: medico invalido");
        require(documentHash != bytes32(0), "MedicalDocumentRegistry: hash invalido");
        require(bytes(documentType).length > 0, "MedicalDocumentRegistry: tipo invalido");
        require(bytes(offChainRef).length > 0, "MedicalDocumentRegistry: referencia invalida");
        require(signature.length > 0, "MedicalDocumentRegistry: firma requerida");

        //reconstruye el mensaje que el medico debio haber firmado (hasheado)
        bytes32 structHash = keccak256(
            abi.encode(
                MEDICAL_DOCUMENT_TYPEHASH,
                patient,
                documentHash,
                keccak256(bytes(documentType)),
                keccak256(bytes(offChainRef)),
                doctor
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash); //agarra el structHash y le agrega información del esxtandar EIP-712
        address signer = ECDSA.recover(digest, signature); //recupera el firmante a partir del hash y la firma
        require(signer != address(0), "MedicalDocumentRegistry: firma invalida");
        require(signer == doctor, "MedicalDocumentRegistry: firma no corresponde al medico");
        require(
            _userRegistry.isVerifiedEmitter(doctor),
            "MedicalDocumentRegistry: medico no verificado"
        );
        require(
            _userRegistry.isRegistered(patient),
            "MedicalDocumentRegistry: paciente no registrado"
        );
        require(!_hashExists[documentHash], "MedicalDocumentRegistry: hash ya registrado");

        uint256 documentId = _nextDocumentId++; //asigna un nuevo ID al documento


        _documents[documentId] = MedicalDocument({
            id: documentId,
            documentHash: documentHash,
            patient: patient,
            issuer: doctor,
            documentType: documentType,
            offChainRef: offChainRef,
            issuedAt: block.timestamp,
            status: DocumentStatus.VERIFIED_ISSUER_DOCUMENT
        });

        _hashExists[documentHash] = true;
        _patientDocuments[patient].push(documentId);

        emit DocumentRegistered(documentId, patient, doctor, DocumentStatus.VERIFIED_ISSUER_DOCUMENT);

        return documentId;
    }


     //El paciente sube un documento propio
    //Queda marcado como PATIENT_UPLOADED, sin respaldo de emisor verificado
    function uploadOwnDocument(
        bytes32 documentHash,
        string calldata documentType,
        string calldata offChainRef
    ) external returns (uint256) {
        require(
            _userRegistry.isRegistered(msg.sender),
            "MedicalDocumentRegistry: usuario no registrado"
        );
        require(documentHash != bytes32(0), "MedicalDocumentRegistry: hash invalido");
        require(!_hashExists[documentHash], "MedicalDocumentRegistry: hash ya registrado");

        uint256 documentId = _nextDocumentId++;

        _documents[documentId] = MedicalDocument({
            id: documentId,
            documentHash: documentHash,
            patient: msg.sender,
            issuer: msg.sender,
            documentType: documentType,
            offChainRef: offChainRef,
            issuedAt: block.timestamp,
            status: DocumentStatus.PATIENT_UPLOADED
        });

        _hashExists[documentHash] = true;
        _patientDocuments[msg.sender].push(documentId);

        emit DocumentRegistered(documentId, msg.sender, msg.sender, DocumentStatus.PATIENT_UPLOADED);

        return documentId;
    }


    //emisor original puede revocar un documento que emitio y paciente puede revocar sus propios uploads
    function revokeDocument(uint256 documentId) external {
        require(documentId < _nextDocumentId, "MedicalDocumentRegistry: documento no existe");
        MedicalDocument storage doc = _documents[documentId];
        require(doc.status != DocumentStatus.REVOKED, "MedicalDocumentRegistry: ya revocado");
        require(
            msg.sender == doc.issuer || msg.sender == doc.patient,
            "MedicalDocumentRegistry: no autorizado"
        );

        doc.status = DocumentStatus.REVOKED;

        emit DocumentRevoked(documentId, msg.sender);
    }


    //Verifica que el hash del archivo actual coincida con el registrado
    function verifyDocument(uint256 documentId, bytes32 hashToVerify) external view returns (bool) {
        require(documentId < _nextDocumentId, "MedicalDocumentRegistry: documento no existe");
        MedicalDocument storage doc = _documents[documentId];
        return doc.documentHash == hashToVerify && doc.status != DocumentStatus.REVOKED;
    }


    //Consultado por PermissionManager para saber quién es el paciente dueño del documento
    function getDocument(uint256 documentId) external view returns (MedicalDocument memory) {
        require(documentId < _nextDocumentId, "MedicalDocumentRegistry: documento no existe");
        return _documents[documentId];
    }

    function getPatientDocuments(address patient) external view returns (uint256[] memory) {
        return _patientDocuments[patient];
    }

    function documentExists(uint256 documentId) external view returns (bool) {
        return documentId < _nextDocumentId;
    }

    function isHashRegistered(bytes32 documentHash) external view returns (bool) {
        return _hashExists[documentHash];
    }
}
