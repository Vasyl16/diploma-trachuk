"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipesModule = void 0;
const common_1 = require("@nestjs/common");
const ai_module_1 = require("../ai/ai.module");
const storage_module_1 = require("../storage/storage.module");
const recipe_comments_controller_1 = require("./recipe-comments.controller");
const recipe_favorites_controller_1 = require("./recipe-favorites.controller");
const recipes_controller_1 = require("./recipes.controller");
const recipes_service_1 = require("./recipes.service");
let RecipesModule = class RecipesModule {
};
exports.RecipesModule = RecipesModule;
exports.RecipesModule = RecipesModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AiModule, storage_module_1.StorageModule],
        controllers: [
            recipe_comments_controller_1.RecipeCommentsController,
            recipe_favorites_controller_1.RecipeFavoritesController,
            recipes_controller_1.RecipesController,
        ],
        providers: [recipes_service_1.RecipesService],
    })
], RecipesModule);
//# sourceMappingURL=recipes.module.js.map