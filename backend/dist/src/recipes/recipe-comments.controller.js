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
exports.RecipeCommentsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_recipe_comment_dto_1 = require("./dto/create-recipe-comment.dto");
const recipes_service_1 = require("./recipes.service");
let RecipeCommentsController = class RecipeCommentsController {
    recipesService;
    constructor(recipesService) {
        this.recipesService = recipesService;
    }
    listComments(recipeId, user) {
        return this.recipesService.listRecipeComments(recipeId, user?.id);
    }
    createComment(recipeId, user, body) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.createRecipeComment(recipeId, user.id, body.body);
    }
    deleteComment(recipeId, commentId, user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.deleteRecipeComment(recipeId, commentId, user.id);
    }
};
exports.RecipeCommentsController = RecipeCommentsController;
__decorate([
    (0, common_1.Get)('recipes/:recipeId/comments'),
    __param(0, (0, common_1.Param)('recipeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipeCommentsController.prototype, "listComments", null);
__decorate([
    (0, common_1.Post)('recipes/:recipeId/comments'),
    __param(0, (0, common_1.Param)('recipeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_recipe_comment_dto_1.CreateRecipeCommentDto]),
    __metadata("design:returntype", void 0)
], RecipeCommentsController.prototype, "createComment", null);
__decorate([
    (0, common_1.Delete)('recipes/:recipeId/comments/:commentId'),
    __param(0, (0, common_1.Param)('recipeId')),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], RecipeCommentsController.prototype, "deleteComment", null);
exports.RecipeCommentsController = RecipeCommentsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [recipes_service_1.RecipesService])
], RecipeCommentsController);
//# sourceMappingURL=recipe-comments.controller.js.map