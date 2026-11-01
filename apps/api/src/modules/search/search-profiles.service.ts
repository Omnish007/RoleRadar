import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { SearchProfileInput, SearchProfileUpdate } from "@roleradar/contracts";
import { SearchProfile, SearchProfileDocument } from "./search-profile.schema";

@Injectable()
export class SearchProfilesService implements OnModuleInit {
  constructor(@InjectModel(SearchProfile.name) private readonly model: Model<SearchProfileDocument>) {}

  async onModuleInit(): Promise<void> {
    // Preserve saved profiles created by earlier builds before Mongoose's reserved-key conflict was corrected.
    await this.model.collection.updateMany(
      { collection: { $exists: true }, collectionName: { $exists: false } },
      { $rename: { collection: "collectionName" } }
    );
  }

  async create(input: SearchProfileInput) {
    const profile = await this.model.create({
      name: input.intent.name,
      intent: input.intent,
      collectionName: input.collection
    });
    return this.toResponse(profile.toObject());
  }

  async findAll() {
    const profiles = await this.model.find().sort({ collectionName: 1, updatedAt: -1 }).lean().exec();
    return profiles.map((profile) => this.toResponse(profile));
  }

  async update(id: string, input: SearchProfileUpdate) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Search profile not found.");
    const { collection, ...fields } = input;
    const update = {
      ...fields,
      ...(collection !== undefined ? { collectionName: collection } : {}),
      ...(input.intent && !input.name ? { name: input.intent.name } : {})
    };
    const result = await this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean().exec();
    if (!result) throw new NotFoundException("Search profile not found.");
    return this.toResponse(result);
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Search profile not found.");
    const result = await this.model.findByIdAndDelete(id);
    if (!result) throw new NotFoundException("Search profile not found.");
    return { deleted: true };
  }

  private toResponse<T extends { collectionName?: string }>(profile: T) {
    const { collectionName, ...fields } = profile;
    return { ...fields, collection: collectionName || "General" };
  }
}
