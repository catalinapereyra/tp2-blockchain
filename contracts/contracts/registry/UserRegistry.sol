// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//permite que el contrato tenga un owner (admin) que va a poder ejecutar funciones restringidas como aprobar, rechazar o revocar usuarios
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

    //defino la estrctura user (para agrupar datos relacionados)
    struct User {
        Role role;
        UserStatus status;
        uint256 registeredAt;
        uint256 updatedAt; //ultima vez q se actualizo el estado del usuario
    }


    mapping(address => User) private _users; //relaciona una direccion de wallet con un usuario
    mapping(address => bool) private _registered; //para no tener doble registro

    MedicalRegistry private _medicalRegistry;


    event PatientRegistered(address indexed patient);
    event ProfessionalRegistrationRequested(address indexed professional, Role role);
    event UserApproved(address indexed user, Role role);
    event UserRejected(address indexed user);
    event UserRevoked(address indexed user);
    event MedicalRegistrySet(address indexed medicalRegistry);//ee emite cuando se configura la dir del contrato MedicalRegistry


    constructor() Ownable(msg.sender) {} //indica que la wallet que deploya el contrato sera el owner


//permite configurar la direccion del contrato MedicalRegistry
    function setMedicalRegistry(address medicalRegistry) external onlyOwner {
        require(medicalRegistry != address(0), "UserRegistry: direccion invalida");
        _medicalRegistry = MedicalRegistry(medicalRegistry);
        emit MedicalRegistrySet(medicalRegistry); //emite evento avisando q se configuro mr
    }


    //El paciente se registra directamente, sin aprobación del admin
    // Queda con estado APPROVED desde el momento en que se registra

    //para q una wallet se registre como paciente
    function registerAsPatient() external {
        require(!_registered[msg.sender], "UserRegistry: ya registrado");

        _users[msg.sender] = User({ //dirección de la wallet que firmo la transaccion
            role: Role.PATIENT,
            status: UserStatus.APPROVED,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _registered[msg.sender] = true; //marca wallet como registrada

        emit PatientRegistered(msg.sender); //emite evento avisando q el paciente fue registrado
    }


    //medico, laboratorio o institución se registran como PENDING
    //No pueden operar hasta que el admin los apruebe
    function registerAsProfessional(Role role) external {
        require(!_registered[msg.sender], "UserRegistry: ya registrado");
        require(role != Role.PATIENT, "UserRegistry: usar registerAsPatient");

        _users[msg.sender] = User({
            role: role, //crea con el rol elegido
            status: UserStatus.PENDING,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _registered[msg.sender] = true;

        //Emite un evento indicando que ese profesional pidio registrarse
        emit ProfessionalRegistrationRequested(msg.sender, role);
    }


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
            _medicalRegistry.registerEmitter(user, _toEmitterType(role)); //Que el contrato MedicalRegistry haya sido configurado
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

    //para obtener toda la información del usuario
    function getUser(address user) external view returns (User memory) {
        require(_registered[user], "UserRegistry: no registrado");
        return _users[user];
    }

    function getStatus(address user) external view returns (UserStatus) {
        require(_registered[user], "UserRegistry: no registrado");
        return _users[user].status;
    }


    //convierte un rol de UserRegistry en un tipo de emisor de MedicalRegistry
    function _toEmitterType(Role role) private pure returns (MedicalRegistry.EmitterType) {
        if (role == Role.DOCTOR) return MedicalRegistry.EmitterType.DOCTOR;
        if (role == Role.LABORATORY) return MedicalRegistry.EmitterType.LABORATORY;
        return MedicalRegistry.EmitterType.INSTITUTION;
    }
}
