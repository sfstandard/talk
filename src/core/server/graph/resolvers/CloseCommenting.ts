import * as settings from "coral-server/models/settings";
import { translate } from "coral-server/services/i18n";

import { GQLCloseCommentingResolvers } from "coral-server/graph/schema/__generated__/types";

import GraphContext from "../context";

export const CloseCommenting: GQLCloseCommentingResolvers<
  GraphContext,
  settings.CloseCommenting
> = {
  message: (closeCommenting, input, ctx) => {
    if (closeCommenting.message) {
      return closeCommenting.message;
    }

    // Get the translation bundle.
    const bundle = ctx.i18n.getBundle(ctx.lang);

    // Translate the default close message.
    return translate(
      bundle,
      "Comments are closed on this story.",
      "closeCommentingDefaultMessage"
    );
  },
};
