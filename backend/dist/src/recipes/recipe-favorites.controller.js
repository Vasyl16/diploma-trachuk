"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeFavoritesController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const recipes_service_1 = require("./recipes.service");
let RecipeFavoritesController = class RecipeFavoritesController {
    recipesService;
    constructor(recipesService) {
        this.recipesService = recipesService;
    }
    favorites(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.findFavoritesForUser(user.id);
    }
    liked(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.findLikedRecipesForUser(user.id);
    }
    publishedByUser(userId, user) {
        return this.recipesService.findPublishedByUser(userId, user?.id);
    }
};
exports.RecipeFavoritesController = RecipeFavoritesController;
__decorate([
    (0, common_1.Get)('favorites'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecipeFavoritesController.prototype, "favorites", null);
__decorate([
    (0, common_1.Get)('liked'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecipeFavoritesController.prototype, "liked", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipeFavoritesController.prototype, "publishedByUser", null);
exports.RecipeFavoritesController = RecipeFavoritesController = __decorate([
    (0, common_1.Controller)('recipes'),
    __metadata("design:paramtypes", [recipes_service_1.RecipesService])
], RecipeFavoritesController);
//# sourceMappingURL=recipe-favorites.controller.js.map