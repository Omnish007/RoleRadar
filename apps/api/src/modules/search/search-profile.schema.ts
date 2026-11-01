import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SearchProfileDocument = HydratedDocument<SearchProfile>;

@Schema({ timestamps: true, versionKey: false })
export class SearchProfile {
  @Prop({ required: true, trim: true, maxlength: 100 }) name: string;
  @Prop({ type: Object, required: true }) intent: Record<string, unknown>;
  @Prop({ required: true, trim: true, maxlength: 80, default: "General" }) collectionName: string;
}
export const SearchProfileSchema = SchemaFactory.createForClass(SearchProfile);
SearchProfileSchema.index({ name: 1 }, { unique: true });
