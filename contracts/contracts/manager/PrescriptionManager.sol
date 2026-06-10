// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../registry/MedicalRegistry.sol";
import "../registry/UserRegistry.sol";
import "../registry/MedicalDocumentRegistry.sol";


contract PrescriptionManager is Ownable {


    enum PrescriptionStatus {
        PENDING,
        ACCEPTED,
        REJECTED,
        ISSUED,
        CANCELLED
    }

    struct Prescription {
        uint256 id;
        address patient;
        address doctor;
        string prescriptionType;
        PrescriptionStatus status;
        bytes32 documentHash;   // vacío hasta que se emite
        string offChainRef;     // CID de IPFS, vacío hasta que se emite
        uint256 requestedAt;
        uint256 updatedAt;
    }


    mapping(uint256 => Prescription) private _prescriptions;
    mapping(address => uint256[]) private _patientPrescriptions;
    mapping(address => uint256[]) private _doctorPrescriptions;
    uint256 private _nextId;

    MedicalRegistry private immutable _medicalRegistry;
    UserRegistry private immutable _userRegistry;
    MedicalDocumentRegistry private immutable _documentRegistry;


    event PrescriptionRequested(
        uint256 indexed id,
        address indexed patient,
        address indexed doctor,
        string prescriptionType
    );
    event PrescriptionAccepted(uint256 indexed id, address indexed doctor);
    event PrescriptionRejected(uint256 indexed id, address indexed doctor);
    event PrescriptionIssued(uint256 indexed id, address indexed doctor, bytes32 documentHash);
    event PrescriptionCancelled(uint256 indexed id, address indexed patient);


    constructor(
        address medicalRegistry,
        address userRegistry,
        address documentRegistry
    ) Ownable(msg.sender) {
        require(medicalRegistry != address(0), "PrescriptionManager: medicalRegistry invalido");
        require(userRegistry != address(0), "PrescriptionManager: userRegistry invalido");
        require(documentRegistry != address(0), "PrescriptionManager: documentRegistry invalido");
        _medicalRegistry = MedicalRegistry(medicalRegistry);
        _userRegistry = UserRegistry(userRegistry);
        _documentRegistry = MedicalDocumentRegistry(documentRegistry);
    }


    /**
     * El paciente solicita una receta a un médico verificado.
     */
    function requestPrescription(
        address doctor,
        string calldata prescriptionType
    ) external returns (uint256) {
        require(_userRegistry.isRegistered(msg.sender), "PrescriptionManager: paciente no registrado");
        require(_medicalRegistry.isVerifiedEmitter(doctor), "PrescriptionManager: medico no verificado");
        require(doctor != msg.sender, "PrescriptionManager: no puede solicitarse a si mismo");

        uint256 id = _nextId++;

        _prescriptions[id] = Prescription({
            id: id,
            patient: msg.sender,
            doctor: doctor,
            prescriptionType: prescriptionType,
            status: PrescriptionStatus.PENDING,
            documentHash: bytes32(0),
            offChainRef: "",
            requestedAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _patientPrescriptions[msg.sender].push(id);
        _doctorPrescriptions[doctor].push(id);

        emit PrescriptionRequested(id, msg.sender, doctor, prescriptionType);

        return id;
    }

    /**
     * El paciente cancela su solicitud mientras esté PENDING o ACCEPTED.
     */
    function cancelPrescription(uint256 id) external {
        require(id < _nextId, "PrescriptionManager: receta no existe");
        Prescription storage p = _prescriptions[id];
        require(p.patient == msg.sender, "PrescriptionManager: no es el paciente");
        require(
            p.status == PrescriptionStatus.PENDING || p.status == PrescriptionStatus.ACCEPTED,
            "PrescriptionManager: no se puede cancelar"
        );

        p.status = PrescriptionStatus.CANCELLED;
        p.updatedAt = block.timestamp;

        emit PrescriptionCancelled(id, msg.sender);
    }


    /**
     * El médico asignado acepta la solicitud.
     */
    function acceptPrescription(uint256 id) external {
        require(id < _nextId, "PrescriptionManager: receta no existe");
        Prescription storage p = _prescriptions[id];
        require(p.doctor == msg.sender, "PrescriptionManager: no es el medico asignado");
        require(p.status == PrescriptionStatus.PENDING, "PrescriptionManager: no esta pendiente");

        p.status = PrescriptionStatus.ACCEPTED;
        p.updatedAt = block.timestamp;

        emit PrescriptionAccepted(id, msg.sender);
    }

    /**
     * El médico asignado rechaza la solicitud.
     */
    function rejectPrescription(uint256 id) external {
        require(id < _nextId, "PrescriptionManager: receta no existe");
        Prescription storage p = _prescriptions[id];
        require(p.doctor == msg.sender, "PrescriptionManager: no es el medico asignado");
        require(p.status == PrescriptionStatus.PENDING, "PrescriptionManager: no esta pendiente");

        p.status = PrescriptionStatus.REJECTED;
        p.updatedAt = block.timestamp;

        emit PrescriptionRejected(id, msg.sender);
    }

    /**
     * El médico emite la receta adjuntando el hash del documento.
     * La solicitud debe estar en ACCEPTED.
     * Registra el hash automáticamente en MedicalDocumentRegistry.
     */
    function issuePrescription(
        uint256 id,
        bytes32 documentHash,
        string calldata offChainRef
    ) external {
        require(id < _nextId, "PrescriptionManager: receta no existe");
        Prescription storage p = _prescriptions[id];
        require(p.doctor == msg.sender, "PrescriptionManager: no es el medico asignado");
        require(p.status == PrescriptionStatus.ACCEPTED, "PrescriptionManager: no esta aceptada");
        require(documentHash != bytes32(0), "PrescriptionManager: hash invalido");

        p.status = PrescriptionStatus.ISSUED;
        p.documentHash = documentHash;
        p.offChainRef = offChainRef;
        p.updatedAt = block.timestamp;

        // Registrar en el historial médico del paciente
        _documentRegistry.registerDocument(p.patient, documentHash, p.prescriptionType, offChainRef);

        emit PrescriptionIssued(id, msg.sender, documentHash);
    }


    function getPrescription(uint256 id) external view returns (Prescription memory) {
        require(id < _nextId, "PrescriptionManager: receta no existe");
        return _prescriptions[id];
    }

    function getPatientPrescriptions(address patient) external view returns (uint256[] memory) {
        return _patientPrescriptions[patient];
    }

    function getDoctorPrescriptions(address doctor) external view returns (uint256[] memory) {
        return _doctorPrescriptions[doctor];
    }

    function prescriptionExists(uint256 id) external view returns (bool) {
        return id < _nextId;
    }
}
