pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MedicalRegistry is Ownable {


    enum EmitterType { DOCTOR, LABORATORY, INSTITUTION }

    struct MedicalEmitter {
        EmitterType emitterType;
        bool isActive;
        uint256 registeredAt;
    }


    mapping(address => MedicalEmitter) private _emitters; //Relaciona una wallet con sus datos de emisor médico
    mapping(address => bool) private _registered;

    //direccion del UserRegistry, único contrato autorizado a llamar registerEmitter/revokeEmitter
    address private _authorizedCaller;


    event EmitterRegistered(address indexed emitter, EmitterType emitterType);
    event EmitterRevoked(address indexed emitter);
    event AuthorizedCallerSet(address indexed caller);


    constructor() Ownable(msg.sender) {}


    modifier onlyOwnerOrAuthorized() {
        require(
            msg.sender == owner() || msg.sender == _authorizedCaller,
            "MedicalRegistry: no autorizado"
        );
        _;
    }



    //admin setea la direccion del UserRegistry para que pueda llamar registerEmitter y revokeEmitter automaticamente
    function setAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "MedicalRegistry: direccion invalida");
        _authorizedCaller = caller;
        emit AuthorizedCallerSet(caller);
    }


    //registra un emisor medico verificado (llamado automaticamente por UserRegistry cuando el admin aprueba un profesional)
    function registerEmitter(address emitter, EmitterType emitterType) external onlyOwnerOrAuthorized {
        require(emitter != address(0), "MedicalRegistry: direccion invalida");
        require(!_registered[emitter], "MedicalRegistry: ya registrado");

        _emitters[emitter] = MedicalEmitter({
            emitterType: emitterType,
            isActive: true,
            registeredAt: block.timestamp
        });

        _registered[emitter] = true;

        emit EmitterRegistered(emitter, emitterType);
    }


    //revoca a un emisor medico
    //llamado automaticamente por UserRegistry cuando el admin revoca un profesional
    function revokeEmitter(address emitter) external onlyOwnerOrAuthorized {
        require(_registered[emitter], "MedicalRegistry: no registrado");
        require(_emitters[emitter].isActive, "MedicalRegistry: ya revocado");

        _emitters[emitter].isActive = false;

        emit EmitterRevoked(emitter);
    }


    //Consultado por MedicalDocumentRegistry, PrescriptionManager y PermissionManager
    //Devuelve true solo si el emisor esta registrado y activo
    function isVerifiedEmitter(address emitter) external view returns (bool) {
        return _registered[emitter] && _emitters[emitter].isActive;
    }

    function getEmitter(address emitter) external view returns (MedicalEmitter memory) {
        require(_registered[emitter], "MedicalRegistry: no registrado");
        return _emitters[emitter];
    }

    function isRegistered(address emitter) external view returns (bool) {
        return _registered[emitter];
    }

    function getAuthorizedCaller() external view returns (address) {
        return _authorizedCaller;
    }
}
