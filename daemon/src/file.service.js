"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
var fs = __importStar(require("fs/promises"));
var path = __importStar(require("path"));
var FileService = /** @class */ (function () {
    function FileService() {
    }
    FileService.prototype.getServerDir = function (serverId) {
        // serverId here is the uuid without craftynos- prefix
        var dir = path.resolve(process.cwd(), 'server-data', serverId);
        return dir;
    };
    // Prevent directory traversal attacks by validating the resolved path
    FileService.prototype.getSafePath = function (serverId, targetPath) {
        return __awaiter(this, void 0, void 0, function () {
            var rootDir, resolvedPath;
            return __generator(this, function (_a) {
                rootDir = this.getServerDir(serverId);
                resolvedPath = path.resolve(rootDir, targetPath.replace(/^\//, ''));
                if (!resolvedPath.startsWith(rootDir)) {
                    throw new Error('Access denied: Invalid path');
                }
                return [2 /*return*/, resolvedPath];
            });
        });
    };
    FileService.prototype.listFiles = function (serverId_1) {
        return __awaiter(this, arguments, void 0, function (serverId, targetPath) {
            var safePath, entries, files, e_1;
            var _this = this;
            if (targetPath === void 0) { targetPath = ''; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSafePath(serverId, targetPath)];
                    case 1:
                        safePath = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, fs.readdir(safePath, { withFileTypes: true })];
                    case 3:
                        entries = _a.sent();
                        return [4 /*yield*/, Promise.all(entries.map(function (entry) { return __awaiter(_this, void 0, void 0, function () {
                                var fullPath, stats;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            fullPath = path.join(safePath, entry.name);
                                            return [4 /*yield*/, fs.stat(fullPath)];
                                        case 1:
                                            stats = _a.sent();
                                            return [2 /*return*/, {
                                                    name: entry.name,
                                                    isDirectory: entry.isDirectory(),
                                                    size: stats.size,
                                                    lastModified: stats.mtime
                                                }];
                                    }
                                });
                            }); }))];
                    case 4:
                        files = _a.sent();
                        // Sort: directories first, then alphabetically
                        return [2 /*return*/, files.sort(function (a, b) {
                                if (a.isDirectory === b.isDirectory) {
                                    return a.name.localeCompare(b.name);
                                }
                                return a.isDirectory ? -1 : 1;
                            })];
                    case 5:
                        e_1 = _a.sent();
                        if (e_1.code === 'ENOENT') {
                            throw new Error("Path does not exist: ".concat(targetPath));
                        }
                        throw e_1;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    FileService.prototype.readFile = function (serverId, targetPath) {
        return __awaiter(this, void 0, void 0, function () {
            var safePath, stats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSafePath(serverId, targetPath)];
                    case 1:
                        safePath = _a.sent();
                        return [4 /*yield*/, fs.stat(safePath)];
                    case 2:
                        stats = _a.sent();
                        if (stats.isDirectory()) {
                            throw new Error('Cannot read a directory');
                        }
                        return [4 /*yield*/, fs.readFile(safePath, 'utf8')];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    FileService.prototype.writeFile = function (serverId, targetPath, content) {
        return __awaiter(this, void 0, void 0, function () {
            var safePath, dir;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSafePath(serverId, targetPath)];
                    case 1:
                        safePath = _a.sent();
                        dir = path.dirname(safePath);
                        return [4 /*yield*/, fs.mkdir(dir, { recursive: true })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, fs.writeFile(safePath, content, 'utf8')];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        });
    };
    FileService.prototype.deleteFile = function (serverId, targetPath) {
        return __awaiter(this, void 0, void 0, function () {
            var safePath, stats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSafePath(serverId, targetPath)];
                    case 1:
                        safePath = _a.sent();
                        return [4 /*yield*/, fs.stat(safePath)];
                    case 2:
                        stats = _a.sent();
                        if (!stats.isDirectory()) return [3 /*break*/, 4];
                        return [4 /*yield*/, fs.rm(safePath, { recursive: true, force: true })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, fs.unlink(safePath)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [2 /*return*/, { success: true }];
                }
            });
        });
    };
    return FileService;
}());
exports.FileService = FileService;
