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
exports.RecipesController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const ai_generate_recipe_dto_1 = require("./dto/ai-generate-recipe.dto");
const create_recipe_dto_1 = require("./dto/create-recipe.dto");
const update_recipe_dto_1 = require("./dto/update-recipe.dto");
const upload_dish_image_dto_1 = require("./dto/upload-dish-image.dto");
const recipes_service_1 = require("./recipes.service");
let RecipesController = class RecipesController {
    recipesService;
    constructor(recipesService) {
        this.recipesService = recipesService;
    }
    feedFacets() {
        return this.recipesService.getPublishedFeedFacets();
    }
    feed(user, offsetRaw, limitRaw, q, tag, category, includeIng, excludeIng, diet, restriction) {
        const offset = Math.max(0, parseInt(offsetRaw ?? '0', 10) || 0);
        const limit = Math.min(50, Math.max(1, parseInt(limitRaw ?? '12', 10) || 12));
        return this.recipesService.findPublishedFeed(user?.id, {
            offset,
            limit,
            q,
            tag,
            category,
            includeIng,
            excludeIng,
            diet,
            restriction,
        });
    }
    myRecipes(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.findMine(user.id);
    }
    async aiGenerate(user, body) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return await this.recipesService.generateAiRecipe(body, user.id);
    }
    uploadDishImage(id, user, body) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.uploadDishImageFromBase64(id, user.id, body.imageBase64);
    }
    create(user, body) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.create(body, user.id);
    }
    publish(id, user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.publishForUser(id, user.id);
    }
    unpublish(id, user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.unpublishForUser(id, user.id);
    }
    update(id, user, body) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.updateForUser(id, user.id, body);
    }
    like(id, user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.likeRecipe(id, user.id);
    }
    unlike(id, user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.unlikeRecipe(id, user.id);
    }
    save(id, user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.saveRecipe(id, user.id);
    }
    unsave(id, user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.unsaveRecipe(id, user.id);
    }
    findOne(id, user) {
        return this.recipesService.findById(id, user?.id);
    }
    remove(id, user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.recipesService.deleteForUser(id, user.id);
    }
};
exports.RecipesController = RecipesController;
__decorate([
    (0, common_1.Get)('facets'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "feedFacets", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('offset')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('tag')),
    __param(5, (0, common_1.Query)('category')),
    __param(6, (0, common_1.Query)('includeIng')),
    __param(7, (0, common_1.Query)('excludeIng')),
    __param(8, (0, common_1.Query)('diet')),
    __param(9, (0, common_1.Query)('restriction')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "feed", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "myRecipes", null);
__decorate([
    (0, common_1.Post)('ai-generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_generate_recipe_dto_1.AiGenerateRecipeDto]),
    __metadata("design:returntype", Promise)
], RecipesController.prototype, "aiGenerate", null);
__decorate([
    (0, common_1.Post)(':id/dish-image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, upload_dish_image_dto_1.UploadRecipeDishImageDto]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "uploadDishImage", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_recipe_dto_1.CreateRecipeDto]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "publish", null);
__decorate([
    (0, common_1.Patch)(':id/unpublish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "unpublish", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_recipe_dto_1.UpdateRecipeDto]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "like", null);
__decorate([
    (0, common_1.Delete)(':id/like'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "unlike", null);
__decorate([
    (0, common_1.Post)(':id/save'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "save", null);
__decorate([
    (0, common_1.Delete)(':id/save'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "unsave", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "remove", null);
exports.RecipesController = RecipesController = __decorate([
    (0, common_1.Controller)('recipes'),
    __metadata("design:paramtypes", [recipes_service_1.RecipesService])
], RecipesController);
//# sourceMappingURL=recipes.controller.js.map