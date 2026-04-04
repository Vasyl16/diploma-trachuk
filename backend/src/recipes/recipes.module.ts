import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { RecipeFavoritesController } from './recipe-favorites.controller';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [AiModule, StorageModule],
  controllers: [RecipeFavoritesController, RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
