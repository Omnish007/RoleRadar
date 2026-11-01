import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ResumeInput } from "@roleradar/contracts";
import { Resume, ResumeDocument } from "./resume.schema";

@Injectable()
export class ResumesService {
  constructor(@InjectModel(Resume.name) private readonly resumes: Model<ResumeDocument>) {}

  list() { return this.resumes.find().select("-content").sort({ updatedAt: -1 }).limit(500).lean().exec(); }
  get(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Resume not found.");
    return this.resumes.findById(id).lean().orFail(() => new NotFoundException("Resume not found.")).exec();
  }
  create(input: ResumeInput) { return this.resumes.create(input); }
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Resume not found.");
    const result = await this.resumes.findByIdAndDelete(id);
    if (!result) throw new NotFoundException("Resume not found.");
    return { deleted: true };
  }
}
