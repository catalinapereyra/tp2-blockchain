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

    //defino la estrctura user (para agrupar datos relacionados)
    struct User {
        Role role;
        UserStatus status;
        uint256 registeredAt;
        uint256 updatedAt; //ultima vez q se actualizo el estado del usuario
    }


    //unico mapa de usuarios. Para saber si una wallet esta registrada
    //alcanza con mirar registeredAt (0 = nunca se registro)
    mapping(address => User) private _users;


    event PatientRegistered(address indexed patient);
    event ProfessionalRegistrationRequested(address indexed professional, Role role);
    event UserApproved(address indexed user, Role role);
    event UserRejected(address indexed user);
    event UserRevoked(address indexed user);


    constructor() Ownable(msg.sender) {} //indica que la wallet que deploya el contrato sera el owner


    //helper interno: una wallet esta registrada si tiene registeredAt distinto de 0
    function _isRegistered(address user) private view returns (bool) {
        return _users[user].registeredAt != 0;
    }


    //El paciente se registra directamente, sin aprobación del admin
    // Queda con estado APPROVED desde el momento en que se registra

    //para q una wallet se registre como paciente
    function registerAsPatient() external {
        require(!_isRegistered(msg.sender), "UserRegistry: ya registrado");

        _users[msg.sender] = User({ //dirección de la wallet que firmo la transaccion
            role: Role.PATIENT,
            status: UserStatus.APPROVED,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit PatientRegistered(msg.sender); //emite evento avisando q el paciente fue registrado
    }


    //medico, laboratorio o institución se registran como PENDING
    //No pueden operar hasta que el admin los apruebe
    function registerAsProfessional(Role role) external {
        require(!_isRegistered(msg.sender), "UserRegistry: ya registrado");
        require(role != Role.PATIENT, "UserRegistry: usar registerAsPatient");

        _users[msg.sender] = User({
            role: role, //crea con el rol elegido
            status: UserStatus.PENDING,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        //Emite un evento indicando que ese profesional pidio registrarse
        emit ProfessionalRegistrationRequested(msg.sender, role);
    }


    function approveUser(address user) external onlyOwner {
        require(_isRegistered(user), "UserRegistry: no registrado");
        require(
            _users[user].status == UserStatus.PENDING,
            "UserRegistry: no esta pendiente"
        );

        _users[user].status = UserStatus.APPROVED;
        _users[user].updatedAt = block.timestamp;

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
        _users[user].updatedAt = block.timestamp;

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
        _users[user].updatedAt = block.timestamp;

        emit UserRevoked(user);
    }


    function isApproved(address user) external view returns (bool) {
        return _users[user].status == UserStatus.APPROVED && _isRegistered(user);
    }

    function isRegistered(address user) external view returns (bool) {
        return _isRegistered(user);
    }

    //un emisor verificado es un profesional (no paciente) aprobado.
    //Reemplaza lo que antes hacia MedicalRegistry.isVerifiedEmitter
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

    //para obtener toda la información del usuario
    function getUser(address user) external view returns (User memory) {
        require(_isRegistered(user), "UserRegistry: no registrado");
        return _users[user];
    }

    function getStatus(address user) external view returns (UserStatus) {
        require(_isRegistered(user), "UserRegistry: no registrado");
        return _users[user].status;
    }
}
