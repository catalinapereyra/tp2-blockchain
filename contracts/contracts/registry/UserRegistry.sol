// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MedicalRegistry.sol";

contract UserRegistry is Ownable {


    enum Role {
        PATIENT,
        DOCTOR,
        LABORATORY,
        INSTITUTION
    }

    enum UserStatus {
        PENDING,
        APPROVED,
        REJECTED,
        REVOKED
    }

    struct User {
        Role role;
        UserStatus status;
        uint256 registeredAt;
        uint256 updatedAt;
    }


    mapping(address => User) private _users;
    mapping(address => bool) private _registered;

    MedicalRegistry private _medicalRegistry;


    event PatientRegistered(address indexed patient);
    event ProfessionalRegistrationRequested(address indexed professional, Role role);
    event UserApproved(address indexed user, Role role);
    event UserRejected(address indexed user);
    event UserRevoked(address indexed user);
    event MedicalRegistrySet(address indexed medicalRegistry);


    constructor() Ownable(msg.sender) {}


    function setMedicalRegistry(address medicalRegistry) external onlyOwner {
        require(medicalRegistry != address(0), "UserRegistry: direccion invalida");
        _medicalRegistry = MedicalRegistry(medicalRegistry);
        emit MedicalRegistrySet(medicalRegistry);
    }


    //El paciente se registra directamente, sin aprobación del admin
    // Queda con estado APPROVED desde el momento en que se registra
    function registerAsPatient() external {
        require(!_registered[msg.sender], "UserRegistry: ya registrado");

        _users[msg.sender] = User({
            role: Role.PATIENT,
            status: UserStatus.APPROVED,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _registered[msg.sender] = true;

        emit PatientRegistered(msg.sender);
    }


    //Médico, laboratorio o institución se registran como PENDING.
    //No pueden operar hasta que el admin los apruebe
    function registerAsProfessional(Role role) external {
        require(!_registered[msg.sender], "UserRegistry: ya registrado");
        require(role != Role.PATIENT, "UserRegistry: usar registerAsPatient");

        _users[msg.sender] = User({
            role: role,
            status: UserStatus.PENDING,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _registered[msg.sender] = true;

        emit ProfessionalRegistrationRequested(msg.sender, role);
    }


    //El admin aprueba una solicitud pendiente
    //Si hay MedicalRegistry seteado y el usuario no es paciente, lo registra automáticamente como emisor médico verificado
    function approveUser(address user) external onlyOwner {
        require(_registered[user], "UserRegistry: no registrado");
        require(
            _users[user].status == UserStatus.PENDING,
            "UserRegistry: no esta pendiente"
        );

        Role role = _users[user].role;

        _users[user].status = UserStatus.APPROVED;
        _users[user].updatedAt = block.timestamp;

        if (role != Role.PATIENT && address(_medicalRegistry) != address(0)) {
            _medicalRegistry.registerEmitter(user, _toEmitterType(role));
        }

        emit UserApproved(user, role);
    }

    //admin rechaza una solicitud pendiente
    function rejectUser(address user) external onlyOwner {
        require(_registered[user], "UserRegistry: no registrado");
        require(
            _users[user].status == UserStatus.PENDING,
            "UserRegistry: no esta pendiente"
        );

        _users[user].status = UserStatus.REJECTED;
        _users[user].updatedAt = block.timestamp;

        emit UserRejected(user);
    }


    //admin revoca a un profesional aprobado
    //También lo revoca en MedicalRegistry automáticamente
    function revokeUser(address user) external onlyOwner {
        require(_registered[user], "UserRegistry: no registrado");
        require(
            _users[user].status == UserStatus.APPROVED,
            "UserRegistry: no esta aprobado"
        );

        _users[user].status = UserStatus.REVOKED;
        _users[user].updatedAt = block.timestamp;

        if (_users[user].role != Role.PATIENT && address(_medicalRegistry) != address(0)) {
            _medicalRegistry.revokeEmitter(user);
        }

        emit UserRevoked(user);
    }


    function isApproved(address user) external view returns (bool) {
        return _registered[user] && _users[user].status == UserStatus.APPROVED;
    }

    function isRegistered(address user) external view returns (bool) {
        return _registered[user];
    }

    function getRole(address user) external view returns (Role) {
        require(_registered[user], "UserRegistry: no registrado");
        return _users[user].role;
    }

    function getUser(address user) external view returns (User memory) {
        require(_registered[user], "UserRegistry: no registrado");
        return _users[user];
    }

    function getStatus(address user) external view returns (UserStatus) {
        require(_registered[user], "UserRegistry: no registrado");
        return _users[user].status;
    }


    function _toEmitterType(Role role) private pure returns (MedicalRegistry.EmitterType) {
        if (role == Role.DOCTOR) return MedicalRegistry.EmitterType.DOCTOR;
        if (role == Role.LABORATORY) return MedicalRegistry.EmitterType.LABORATORY;
        return MedicalRegistry.EmitterType.INSTITUTION;
    }
}
