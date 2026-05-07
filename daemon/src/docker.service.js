"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerService = void 0;
var dockerode_1 = __importDefault(require("dockerode"));
var DockerService = /** @class */ (function () {
    function DockerService() {
        // Defaults to //./pipe/docker_engine on Windows, or /var/run/docker.sock on Linux
        this.docker = new dockerode_1.default();
    }
    DockerService.prototype.getDocker = function () {
        return this.docker;
    };
    DockerService.prototype.createMinecraftServer = function (name, domain, memoryMB) {
        return __awaiter(this, void 0, void 0, function () {
            var fs, path, dataDir, container, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        fs = require('fs');
                        path = require('path');
                        dataDir = path.resolve(process.cwd(), 'server-data', name);
                        if (!fs.existsSync(dataDir)) {
                            fs.mkdirSync(dataDir, { recursive: true });
                        }
                        // Pull the image first (this is a simplified example, pulling can take time)
                        console.log("Ensuring itzg/minecraft-server is pulled...");
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                _this.docker.pull('itzg/minecraft-server', function (err, stream) {
                                    if (err)
                                        return reject(err);
                                    _this.docker.modem.followProgress(stream, onFinished, onProgress);
                                    function onFinished(err, output) {
                                        if (err)
                                            return reject(err);
                                        resolve(output);
                                    }
                                    function onProgress(event) { }
                                });
                            })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.docker.createContainer({
                                Image: 'itzg/minecraft-server',
                                name: "craftynos-".concat(name),
                                OpenStdin: true,
                                Tty: true,
                                Env: [
                                    'EULA=TRUE',
                                    'ONLINE_MODE=FALSE',
                                    "MEMORY=".concat(memoryMB, "M")
                                ],
                                Labels: {
                                    'mc-router.host': domain,
                                    'mc-router.port': '25565'
                                },
                                HostConfig: {
                                    NetworkMode: 'craftynos-net',
                                    Binds: [
                                        // Bind mount the host directory to /data inside the container
                                        "".concat(dataDir, ":/data")
                                    ],
                                    Memory: memoryMB * 1024 * 1024,
                                },
                                ExposedPorts: {
                                    '25565/tcp': {}
                                }
                            })];
                    case 2:
                        container = _a.sent();
                        return [4 /*yield*/, container.start()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, { containerId: container.id }];
                    case 4:
                        error_1 = _a.sent();
                        console.error('Error creating container:', error_1);
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    DockerService.prototype.startContainer = function (containerId) {
        return __awaiter(this, void 0, void 0, function () {
            var container;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.docker.getContainer(containerId);
                        return [4 /*yield*/, container.start()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DockerService.prototype.stopContainer = function (containerId) {
        return __awaiter(this, void 0, void 0, function () {
            var container;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.docker.getContainer(containerId);
                        return [4 /*yield*/, container.stop()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DockerService.prototype.killContainer = function (containerId) {
        return __awaiter(this, void 0, void 0, function () {
            var container;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.docker.getContainer(containerId);
                        return [4 /*yield*/, container.kill()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DockerService.prototype.getContainerStream = function (containerId) {
        return __awaiter(this, void 0, void 0, function () {
            var container, stream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.docker.getContainer(containerId);
                        return [4 /*yield*/, container.attach({
                                stream: true,
                                stdout: true,
                                stderr: true,
                                stdin: true,
                                logs: true // Include previous logs
                            })];
                    case 1:
                        stream = _a.sent();
                        return [2 /*return*/, stream];
                }
            });
        });
    };
    DockerService.prototype.sendCommand = function (containerId, command) {
        return __awaiter(this, void 0, void 0, function () {
            var container, exec, stream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.docker.getContainer(containerId);
                        return [4 /*yield*/, container.exec({
                                Cmd: ['rcon-cli', command],
                                AttachStdout: true,
                                AttachStderr: true,
                                Tty: true
                            })];
                    case 1:
                        exec = _a.sent();
                        return [4 /*yield*/, exec.start({})];
                    case 2:
                        stream = _a.sent();
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                var output = '';
                                stream.on('data', function (chunk) {
                                    output += chunk.toString('utf8');
                                });
                                stream.on('end', function () { return resolve(output); });
                                stream.on('error', reject);
                            })];
                }
            });
        });
    };
    return DockerService;
}());
exports.DockerService = DockerService;
