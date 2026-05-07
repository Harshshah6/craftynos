"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var http_1 = require("http");
var socket_io_1 = require("socket.io");
var docker_service_1 = require("./docker.service");
var file_service_1 = require("./file.service");
var app = (0, express_1.default)();
var httpServer = (0, http_1.createServer)(app);
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
    }
});
var dockerService = new docker_service_1.DockerService();
var fileService = new file_service_1.FileService();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post('/servers/create', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, domain, memoryMB, result, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, name_1 = _a.name, domain = _a.domain, memoryMB = _a.memoryMB;
                return [4 /*yield*/, dockerService.createMinecraftServer(name_1, domain, memoryMB)];
            case 1:
                result = _b.sent();
                res.json(__assign({ success: true }, result));
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                res.status(500).json({ success: false, error: error_1.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.post('/servers/:id/:action', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, id, action, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 8, , 9]);
                _a = req.params, id = _a.id, action = _a.action;
                if (!(action === 'start')) return [3 /*break*/, 2];
                return [4 /*yield*/, dockerService.startContainer(id)];
            case 1:
                _b.sent();
                return [3 /*break*/, 7];
            case 2:
                if (!(action === 'stop')) return [3 /*break*/, 4];
                return [4 /*yield*/, dockerService.stopContainer(id)];
            case 3:
                _b.sent();
                return [3 /*break*/, 7];
            case 4:
                if (!(action === 'kill')) return [3 /*break*/, 6];
                return [4 /*yield*/, dockerService.killContainer(id)];
            case 5:
                _b.sent();
                return [3 /*break*/, 7];
            case 6: return [2 /*return*/, res.status(400).json({ error: 'Invalid action' })];
            case 7:
                res.json({ success: true });
                return [3 /*break*/, 9];
            case 8:
                error_2 = _b.sent();
                res.status(500).json({ success: false, error: error_2.message });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); });
// File Manager Endpoints
app.get('/servers/:id/files', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, path, files, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                path = req.query.path || '';
                return [4 /*yield*/, fileService.listFiles(id, path)];
            case 1:
                files = _a.sent();
                res.json({ success: true, files: files });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                res.status(500).json({ success: false, error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/servers/:id/files/read', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, path, content, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                path = req.query.path;
                if (!path)
                    return [2 /*return*/, res.status(400).json({ error: 'Path is required' })];
                return [4 /*yield*/, fileService.readFile(id, path)];
            case 1:
                content = _a.sent();
                res.json({ success: true, content: content });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                res.status(500).json({ success: false, error: error_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.put('/servers/:id/files/write', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, path, content, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                _a = req.body, path = _a.path, content = _a.content;
                if (!path)
                    return [2 /*return*/, res.status(400).json({ error: 'Path is required' })];
                return [4 /*yield*/, fileService.writeFile(id, path, content)];
            case 1:
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _b.sent();
                res.status(500).json({ success: false, error: error_5.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.delete('/servers/:id/files', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, path, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                path = req.query.path;
                if (!path)
                    return [2 /*return*/, res.status(400).json({ error: 'Path is required' })];
                return [4 /*yield*/, fileService.deleteFile(id, path)];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                res.status(500).json({ success: false, error: error_6.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// WebSocket for log streaming
io.on('connection', function (socket) {
    console.log("[WS] Client connected: ".concat(socket.id));
    socket.on('attach', function (containerName) { return __awaiter(void 0, void 0, void 0, function () {
        var stream_1, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[WS] Attaching to container: ".concat(containerName));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, dockerService.getContainerStream(containerName)];
                case 2:
                    stream_1 = _a.sent();
                    if (!stream_1) {
                        socket.emit('log', "\r\n\u001B[31mError: Could not attach to ".concat(containerName, "\u001B[0m\r\n"));
                        return [2 /*return*/];
                    }
                    // Stream logs to client
                    // Because we now use Tty: true when creating the container, the output is raw (not multiplexed)
                    stream_1.on('data', function (chunk) {
                        socket.emit('log', chunk.toString('utf8'));
                    });
                    socket.on('command', function (cmd) { return __awaiter(void 0, void 0, void 0, function () {
                        var output, lines, _i, lines_1, line, err_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, dockerService.sendCommand(containerName, cmd)];
                                case 1:
                                    output = _a.sent();
                                    if (output && output.trim().length > 0) {
                                        lines = output.trim().split('\n');
                                        for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                                            line = lines_1[_i];
                                            socket.emit('log', "\r\n\u001B[36m[RCON]\u001B[0m ".concat(line.replace(/\r/g, '')));
                                        }
                                        socket.emit('log', '\r\n');
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_1 = _a.sent();
                                    socket.emit('log', "\r\n\u001B[31m[RCON Error] ".concat(err_1.message, "\u001B[0m\r\n"));
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    socket.on('disconnect', function () {
                        // Clean up stream if needed
                        if (stream_1 && 'destroy' in stream_1) {
                            stream_1.destroy();
                        }
                    });
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    socket.emit('log', "\r\n\u001B[31mError: ".concat(e_1.message, "\u001B[0m\r\n"));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
});
var PORT = process.env.PORT || 8080;
httpServer.listen(PORT, function () {
    console.log("Daemon agent listening on port ".concat(PORT));
});
