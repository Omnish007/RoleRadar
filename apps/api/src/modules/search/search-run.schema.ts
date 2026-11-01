import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SearchRunDocument = HydratedDocument<SearchRun>;

@Schema({ timestamps: true, versionKey: false })
export class SearchRun {
  @Prop({ required: true, trim: true, maxlength: 100 }) profileName: string;
  @Prop({ required: true, enum: ["linkedin", "naukri", "indeed", "wellfound"] }) platform: string;
  @Prop({ required: true, trim: true, maxlength: 80 }) variantId: string;
  @Prop({ maxlength: 4000 }) query?: string;
}
export const SearchRunSchema = SchemaFactory.createForClass(SearchRun);
SearchRunSchema.index({ createdAt: -1 });
