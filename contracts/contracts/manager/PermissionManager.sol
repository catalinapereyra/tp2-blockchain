// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../registry/MedicalDocumentRegistry.sol";
import "../registry/UserRegistry.sol";


contract PermissionManager is Ownable {

    mapping(address => mapping(address => bool)) private _globalAccess;

    mapping(address => mapping(uint256 => mapping(address => bool))) private _documentAccess;

    MedicalDocumentRegistry private immutable _documentRegistry;
    UserRegistry private immutable _userRegistry;


    event GlobalAccessGranted(address indexed patient, address indexed grantee);
    event GlobalAccessRevoked(address indexed patient, address indexed grantee);
    event DocumentAccessGranted(address indexed patient, uint256 indexed documentId, address indexed grantee);
    event DocumentAccessRevoked(address indexed patient, uint256 indexed documentId, address indexed grantee);


    constructor(address documentRegistry, address userRegistry) Ownable(msg.sender) {
        require(documentRegistry != address(0), "PermissionManager: documentRegistry invalido");
        require(userRegistry != address(0), "PermissionManager: userRegistry invalido");
        _documentRegistry = MedicalDocumentRegistry(documentRegistry);
        _userRegistry = UserRegistry(userRegistry);
    }


    //El paciente da acceso total a todos sus documentos a una dirección
    function grantGlobalAccess(address grantee) external {
        require(_userRegistry.isRegistered(msg.sender), "PermissionManager: no registrado");
        require(grantee != address(0), "PermissionManager: beneficiario invalido");
        require(grantee != msg.sender, "PermissionManager: no puede autorizarse a si mismo");
        require(!_globalAccess[msg.sender][grantee], "PermissionManager: acceso ya otorgado");

        _globalAccess[msg.sender][grantee] = true;

        emit GlobalAccessGranted(msg.sender, grantee);
    }


    //paciente revoca el acceso global que había otorgado
    function revokeGlobalAccess(address grantee) external {
        require(_globalAccess[msg.sender][grantee], "PermissionManager: no tiene acceso global");

        _globalAccess[msg.sender][grantee] = false;

        emit GlobalAccessRevoked(msg.sender, grantee);
    }



    //el paciente da acceso a un documento especifico, verifica que el documento exista y le pertenezca
    function grantDocumentAccess(uint256 documentId, address grantee) external {
        require(_userRegistry.isRegistered(msg.sender), "PermissionManager: no registrado");
        require(grantee != address(0), "PermissionManager: beneficiario invalido");
        require(grantee != msg.sender, "PermissionManager: no puede autorizarse a si mismo");
        require(_documentRegistry.documentExists(documentId), "PermissionManager: documento no existe");

        MedicalDocumentRegistry.MedicalDocument memory doc = _documentRegistry.getDocument(documentId);
        require(doc.patient == msg.sender, "PermissionManager: no es dueno del documento");

        require(
            !_documentAccess[msg.sender][documentId][grantee],
            "PermissionManager: acceso ya otorgado"
        );

        _documentAccess[msg.sender][documentId][grantee] = true;

        emit DocumentAccessGranted(msg.sender, documentId, grantee);
    }


    //paciente revoca el acceso a un documento
    function revokeDocumentAccess(uint256 documentId, address grantee) external {
        require(
            _documentAccess[msg.sender][documentId][grantee],
            "PermissionManager: no tiene acceso al documento"
        );

        _documentAccess[msg.sender][documentId][grantee] = false;

        emit DocumentAccessRevoked(msg.sender, documentId, grantee);
    }



    function hasAccess(address patient, uint256 documentId, address grantee) external view returns (bool) {
        return _globalAccess[patient][grantee] || _documentAccess[patient][documentId][grantee];
    }

    function hasGlobalAccess(address patient, address grantee) external view returns (bool) {
        return _globalAccess[patient][grantee];
    }

    function hasDocumentAccess(address patient, uint256 documentId, address grantee) external view returns (bool) {
        return _documentAccess[patient][documentId][grantee];
    }
}
