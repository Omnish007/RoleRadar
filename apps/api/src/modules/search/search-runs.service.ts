import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SearchRunInput } from "@roleradar/contracts";
import { SearchRun, SearchRunDocument } from "./search-run.schema";

@Injectable()
export class SearchRunsService {
  constructor(@InjectModel(SearchRun.name) private readonly model: Model<SearchRunDocument>) {}
  record(input: SearchRunInput) { return this.model.create(input); }
  list() { return this.model.find().sort({ createdAt: -1 }).limit(100).lean().exec(); }
}
