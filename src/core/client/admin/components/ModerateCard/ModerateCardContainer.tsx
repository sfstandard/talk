import { useRouter } from "found";
import React, { FunctionComponent, useCallback, useMemo } from "react";
import { graphql } from "react-relay";

import NotAvailable from "coral-admin/components/NotAvailable";
import FadeInTransition from "coral-framework/components/FadeInTransition";
import { getModerationLink } from "coral-framework/helpers";
import parseModerationOptions from "coral-framework/helpers/parseModerationOptions";
import {
  useLocal,
  useMutation,
  withFragmentContainer,
} from "coral-framework/lib/relay";
import { GQLSTORY_MODE, GQLTAG } from "coral-framework/schema";

import {
  COMMENT_STATUS,
  ModerateCardContainer_comment,
} from "coral-admin/__generated__/ModerateCardContainer_comment.graphql";
import { ModerateCardContainer_settings } from "coral-admin/__generated__/ModerateCardContainer_settings.graphql";
import { ModerateCardContainer_viewer } from "coral-admin/__generated__/ModerateCardContainer_viewer.graphql";
import { ModerateCardContainerLocal } from "coral-admin/__generated__/ModerateCardContainerLocal.graphql";

import FeatureCommentMutation from "./FeatureCommentMutation";
import ModerateCard from "./ModerateCard";
import ModeratedByContainer from "./ModeratedByContainer";
import UnfeatureCommentMutation from "./UnfeatureCommentMutation";

interface Props {
  viewer: ModerateCardContainer_viewer;
  comment: ModerateCardContainer_comment;
  settings: ModerateCardContainer_settings;
  danglingLogic: (status: COMMENT_STATUS) => boolean;
  showStoryInfo: boolean;
  mini?: boolean;
  hideUsername?: boolean;
  onUsernameClicked?: (userID: string) => void;
  onConversationClicked?: (commentID: string) => void;
  onSetSelected?: () => void;
  selected?: boolean;
  selectPrev?: () => void;
  selectNext?: () => void;
  loadNext?: (() => void) | null;
  handleReject: () => void;
  handleApprove: () => void;
}

function getStatus(comment: ModerateCardContainer_comment) {
  switch (comment.status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    default:
      return "undecided";
  }
}

function isFeatured(comment: ModerateCardContainer_comment) {
  return comment.tags.some((t) => t.code === GQLTAG.FEATURED);
}

const ModerateCardContainer: FunctionComponent<Props> = ({
  comment,
  settings,
  viewer,
  danglingLogic,
  showStoryInfo,
  mini,
  hideUsername,
  selected,
  selectPrev,
  selectNext,
  onUsernameClicked: usernameClicked,
  onConversationClicked: conversationClicked,
  onSetSelected: setSelected,
  loadNext,
  handleReject,
  handleApprove,
}) => {
  const featureComment = useMutation(FeatureCommentMutation);
  const unfeatureComment = useMutation(UnfeatureCommentMutation);

  const { match, router } = useRouter();

  const [{ moderationQueueSort }] =
    useLocal<ModerateCardContainerLocal>(graphql`
      fragment ModerateCardContainerLocal on Local {
        moderationQueueSort
      }
    `);

  const scoped = useMemo(() => !!viewer.moderationScopes?.scoped, [viewer]);

  const readOnly = useMemo(
    () => scoped && !comment.canModerate,
    [scoped, comment]
  );

  const handleFeature = useCallback(() => {
    if (!comment.revision) {
      return;
    }

    if (readOnly) {
      return;
    }

    const { storyID, siteID, section } = parseModerationOptions(match);

    void featureComment({
      commentID: comment.id,
      commentRevisionID: comment.revision.id,
      storyID,
      siteID,
      section,
      orderBy: moderationQueueSort,
    });
  }, [featureComment, comment, match, readOnly, moderationQueueSort]);

  const handleUnfeature = useCallback(() => {
    if (readOnly) {
      return;
    }

    void unfeatureComment({
      commentID: comment.id,
      storyID: match.params.storyID,
    });
  }, [unfeatureComment, comment, match, readOnly]);

  const onFeature = useCallback(() => {
    if (readOnly) {
      return;
    }

    const featured = isFeatured(comment);
    if (featured) {
      handleUnfeature();
    } else {
      handleFeature();
    }
  }, [comment, readOnly, handleFeature, handleUnfeature]);

  const onUsernameClicked = useCallback(
    (id?: string) => {
      if (!usernameClicked) {
        return;
      }
      usernameClicked(id || comment.author!.id);
    },
    [usernameClicked, comment]
  );

  const onConversationClicked = useCallback(() => {
    if (!conversationClicked) {
      return;
    }
    conversationClicked(comment.id);
  }, [conversationClicked, comment]);

  const handleModerateStory = useCallback(
    (e: React.MouseEvent) => {
      router.push(getModerationLink({ storyID: comment.story.id }));
      if (e.preventDefault) {
        e.preventDefault();
      }
    },
    [router, comment]
  );

  const onFocusOrClick = useCallback(() => {
    if (setSelected) {
      setSelected();
    }
  }, [setSelected]);

  // Only highlight comments that have been flagged for containing a banned or
  // suspect word.
  const highlight = useMemo(() => {
    if (!comment.revision) {
      return false;
    }

    if (!comment.revision.actionCounts) {
      throw new Error(`action counts missing: ${comment.id}`);
    }

    const count =
      comment.revision.actionCounts.flag.reasons.COMMENT_DETECTED_BANNED_WORD +
      comment.revision.actionCounts.flag.reasons.COMMENT_DETECTED_SUSPECT_WORD;

    return count > 0;
  }, [comment]);

  const isRatingsAndReviews =
    comment.story.settings.mode === GQLSTORY_MODE.RATINGS_AND_REVIEWS;

  return (
    <>
      <FadeInTransition active={!!comment.enteredLive}>
        <ModerateCard
          id={comment.id}
          username={
            comment.author && comment.author.username
              ? comment.author.username
              : ""
          }
          createdAt={comment.createdAt}
          body={comment.body!}
          rating={isRatingsAndReviews ? comment.rating : null}
          highlight={highlight}
          inReplyTo={comment.parent && comment.parent.author}
          comment={comment}
          settings={settings}
          dangling={danglingLogic(comment.status)}
          status={getStatus(comment)}
          featured={isFeatured(comment)}
          viewContextHref={comment.permalink}
          onApprove={handleApprove}
          onReject={handleReject}
          onFeature={onFeature}
          onUsernameClick={onUsernameClicked}
          onConversationClick={
            conversationClicked ? onConversationClicked : null
          }
          selected={selected}
          selectPrev={selectPrev}
          selectNext={selectNext}
          siteName={settings.multisite ? comment.site.name : null}
          moderatedBy={
            <ModeratedByContainer
              onUsernameClicked={onUsernameClicked}
              comment={comment}
            />
          }
          onFocusOrClick={onFocusOrClick}
          showStory={showStoryInfo}
          storyTitle={
            (comment.story.metadata && comment.story.metadata.title) || (
              <NotAvailable />
            )
          }
          storyHref={getModerationLink({ storyID: comment.story.id })}
          onModerateStory={handleModerateStory}
          mini={mini}
          hideUsername={hideUsername}
          deleted={comment.deleted ? comment.deleted : false}
          edited={comment.editing.edited}
          readOnly={readOnly}
          isQA={comment.story.settings.mode === GQLSTORY_MODE.QA}
          bannedWords={comment.revision?.metadata?.wordList?.bannedWords || []}
          suspectWords={
            comment.revision?.metadata?.wordList?.suspectWords || []
          }
          isArchived={comment.story.isArchived}
          isArchiving={comment.story.isArchiving}
        />
      </FadeInTransition>
    </>
  );
};

const enhanced = withFragmentContainer<Props>({
  comment: graphql`
    fragment ModerateCardContainer_comment on Comment {
      id
      author {
        id
        email
        username
        status {
          current
          ban {
            active
            sites {
              id
              name
            }
          }
        }
        role
      }
      statusLiveUpdated
      createdAt
      body
      rating
      revision {
        actionCounts {
          flag {
            reasons {
              COMMENT_DETECTED_BANNED_WORD
              COMMENT_DETECTED_SUSPECT_WORD
            }
          }
        }
        metadata {
          wordList {
            bannedWords {
              value
              index
              length
            }
            suspectWords {
              value
              index
              length
            }
          }
        }
      }
      tags {
        code
      }
      status
      revision {
        id
      }
      editing {
        edited
      }
      parent {
        author {
          id
          username
        }
      }
      canModerate
      story {
        id
        metadata {
          title
        }
        settings {
          mode
        }
        isArchived
        isArchiving
      }
      site {
        id
        name
      }
      permalink
      enteredLive
      deleted
      ...MarkersContainer_comment
      ...ModeratedByContainer_comment
      ...CommentAuthorContainer_comment
      ...MediaContainer_comment
    }
  `,
  settings: graphql`
    fragment ModerateCardContainer_settings on Settings {
      locale
      wordList {
        banned
        suspect
      }
      emailDomainModeration {
        domain
        newUserModeration
      }
      multisite
      ...MarkersContainer_settings
    }
  `,
  viewer: graphql`
    fragment ModerateCardContainer_viewer on User {
      role
      moderationScopes {
        scoped
        sites {
          id
          name
        }
      }
    }
  `,
})(ModerateCardContainer);

export default enhanced;
