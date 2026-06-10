// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MedicalRegistry is Ownable {

    // ─── Tipos ────────────────────────────────────────────────────────────────

    enum ProfessionalType { DOCTOR, LABORATORY, INSTITUTION }

    struct Professional {
        bool isVerified;
        ProfessionalType professionalType;
        string licenseHash;   // hash de la matrícula/habilitación, no el dato real
        string specialty;     // "cardiología", "laboratorio clínico", etc.
        uint256 registeredAt;
    }

    // ─── Estado ───────────────────────────────────────────────────────────────

    mapping(address => Professional) private _professionals;
    mapping(address => bool) private _registered;

    // ─── Eventos ──────────────────────────────────────────────────────────────

    event ProfessionalRegistered(address indexed professional, ProfessionalType professionalType);
    event ProfessionalVerified(address indexed professional);
    event ProfessionalRevoked(address indexed professional);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Funciones públicas ───────────────────────────────────────────────────

    /**
     * El profesional se registra a sí mismo con el hash de su matrícula.
     * Queda pendiente hasta que el owner lo verifique.
     */
    function registerProfessional(
        string calldata licenseHash,
        string calldata specialty,
        ProfessionalType professionalType
    ) external {
        require(!_registered[msg.sender], "MedicalRegistry: ya registrado");
        require(bytes(licenseHash).length > 0, "MedicalRegistry: licenseHash requerido");
        require(bytes(specialty).length > 0, "MedicalRegistry: specialty requerido");

        _professionals[msg.sender] = Professional({
            isVerified: false,
            professionalType: professionalType,
            licenseHash: licenseHash,
            specialty: specialty,
            registeredAt: block.timestamp
        });

        _registered[msg.sender] = true;

        emit ProfessionalRegistered(msg.sender, professionalType);
    }

    /**
     * Solo el owner (admin) puede verificar un profesional.
     */
    function verifyProfessional(address professional) external onlyOwner {
        require(_registered[professional], "MedicalRegistry: no registrado");
        require(!_professionals[professional].isVerified, "MedicalRegistry: ya verificado");

        _professionals[professional].isVerified = true;

        emit ProfessionalVerified(professional);
    }

    /**
     * Solo el owner puede revocar la habilitación.
     */
    function revokeProfessional(address professional) external onlyOwner {
        require(_professionals[professional].isVerified, "MedicalRegistry: no estaba verificado");

        _professionals[professional].isVerified = false;

        emit ProfessionalRevoked(professional);
    }

    // ─── Vistas ───────────────────────────────────────────────────────────────

    /**
     * Consultado por MedicalDocumentRegistry y PermissionManager.
     * Devuelve true solo si el profesional está registrado Y verificado.
     */
    function isVerifiedProfessional(address professional) external view returns (bool) {
        return _registered[professional] && _professionals[professional].isVerified;
    }

    function getProfessional(address professional) external view returns (Professional memory) {
        require(_registered[professional], "MedicalRegistry: no registrado");
        return _professionals[professional];
    }

    function isRegistered(address professional) external view returns (bool) {
        return _registered[professional];
    }
}
