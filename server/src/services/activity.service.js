import { Activity } from "../models/activity.model.js";

export function recordActivity({ issue, actor, type, details = {} }) {
  return Activity.create({
    issue,
    actor,
    type,
    details
  });
}

