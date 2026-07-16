// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//permite que el contrato tenga un owner (admin) que va a poder ejecutar funciones restringidas como aprobar, rechazar o revocar usuarios
import "@openzeppelin/contracts/access/Ownable.sol";

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

    //agrupa los datos de un usuario registrado.
    //no guarda "updatedAt": ningún caller (front ni back) lo lee, y cada transición de
    //estado ya emite su propio evento con block.timestamp si algún día hace falta auditarlo
    struct User {
        Role role;
        UserStatus status;
        uint256 registeredAt;
    }

    //único mapa de usuarios. Para saber si una wallet está registrada
    //alcanza con mirar registeredAt (0 = nunca se registró)
    mapping(address => User) private _users;

    event PatientRegistered(address indexed patient);
    event ProfessionalRegistrationRequested(address indexed professional, Role role);
    event UserApproved(address indexed user, Role role);
    event UserRejected(address indexed user);
    event UserRevoked(address indexed user);

    //la wallet que deploya el contrato queda como owner (admin)
    constructor() Ownable(msg.sender) {}

    //helper interno: una wallet está registrada si tiene registeredAt distinto de 0
    function _isRegistered(address user) private view returns (bool) {
        return _users[user].registeredAt != 0;
    }

    //el paciente se registra directamente, sin aprobación del admin:
    //queda con estado APPROVED desde el momento en que se registra
    function registerAsPatient() external {
        require(!_isRegistered(msg.sender), "UserRegistry: ya registrado");

        _users[msg.sender] = User({
            role: Role.PATIENT,
            status: UserStatus.APPROVED,
            registeredAt: block.timestamp
        });

        emit PatientRegistered(msg.sender);
    }

    //médico, laboratorio o institución se registran como PENDING
    //no pueden operar hasta que el admin los apruebe
    function registerAsProfessional(Role role) external {
        require(!_isRegistered(msg.sender), "UserRegistry: ya registrado");
        require(role != Role.PATIENT, "UserRegistry: usar registerAsPatient");

        _users[msg.sender] = User({
            role: role,
            status: UserStatus.PENDING,
            registeredAt: block.timestamp
        });

        emit ProfessionalRegistrationRequested(msg.sender, role);
    }

    //admin aprueba una solicitud pendiente
    function approveUser(address user) external onlyOwner {
        require(_isRegistered(user), "UserRegistry: no registrado");
        require(
            _users[user].status == UserStatus.PENDING,
            "UserRegistry: no esta pendiente"
        );

        _users[user].status = UserStatus.APPROVED;

        emit UserApproved(user, _users[user].role);
    }

    //admin rechaza una solicitud pendiente
    function rejectUser(address user) external onlyOwner {
        require(_isRegistered(user), "UserRegistry: no registrado");
        require(
            _users[user].status == UserStatus.PENDING,
            "UserRegistry: no esta pendiente"
        );

        _users[user].status = UserStatus.REJECTED;

        emit UserRejected(user);
    }

    //admin revoca a un profesional aprobado
    function revokeUser(address user) external onlyOwner {
        require(_isRegistered(user), "UserRegistry: no registrado");
        require(
            _users[user].status == UserStatus.APPROVED,
            "UserRegistry: no esta aprobado"
        );

        _users[user].status = UserStatus.REVOKED;

        emit UserRevoked(user);
    }

    function isApproved(address user) external view returns (bool) {
        return _users[user].status == UserStatus.APPROVED && _isRegistered(user);
    }

    function isRegistered(address user) external view returns (bool) {
        return _isRegistered(user);
    }

    //un emisor verificado es un profesional (no paciente) aprobado
    function isVerifiedEmitter(address user) external view returns (bool) {
        return
            _isRegistered(user) &&
            _users[user].status == UserStatus.APPROVED &&
            _users[user].role != Role.PATIENT;
    }

    function getRole(address user) external view returns (Role) {
        require(_isRegistered(user), "UserRegistry: no registrado");
        return _users[user].role;
    }

    //para obtener toda la información del usuario. Devuelve una copia en memory
    //porque es una view externa: no se va a modificar, y no se puede devolver una
    //referencia storage fuera del contrato
    function getUser(address user) external view returns (User memory) {
        require(_isRegistered(user), "UserRegistry: no registrado");
        return _users[user];
    }

    function getStatus(address user) external view returns (UserStatus) {
        require(_isRegistered(user), "UserRegistry: no registrado");
        return _users[user].status;
    }
}
