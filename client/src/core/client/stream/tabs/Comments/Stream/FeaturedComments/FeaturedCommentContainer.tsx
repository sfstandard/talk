import { Localized } from "@fluent/react/compat";
import cn from "classnames";
import React, { FunctionComponent, MouseEvent, useCallback } from "react";
import { graphql } from "react-relay";

import { getURLWithCommentID } from "coral-framework/helpers";
import { useViewerEvent } from "coral-framework/lib/events";
import { useMutation } from "coral-framework/lib/relay";
import withFragmentContainer from "coral-framework/lib/relay/withFragmentContainer";
import { GQLSTORY_MODE, GQLTAG, GQLUSER_STATUS } from "coral-framework/schema";
import CLASSES from "coral-stream/classes";
import HTMLContent from "coral-stream/common/HTMLContent";
import Timestamp from "coral-stream/common/Timestamp";
import { ViewConversationEvent } from "coral-stream/events";
import { SetCommentIDMutation } from "coral-stream/mutations";
import {
  CommentBoxIcon,
  ConversationChatIcon,
  SvgIcon,
} from "coral-ui/components/icons";
import {
  Box,
  Flex,
  Hidden,
  HorizontalGutter,
  RelativeTime,
} from "coral-ui/components/v2";
import { Button, StarRating } from "coral-ui/components/v3";

import { FeaturedCommentContainer_comment as CommentData } from "coral-stream/__generated__/FeaturedCommentContainer_comment.graphql";
import { FeaturedCommentContainer_settings as SettingsData } from "coral-stream/__generated__/FeaturedCommentContainer_settings.graphql";
import { FeaturedCommentContainer_story as StoryData } from "coral-stream/__generated__/FeaturedCommentContainer_story.graphql";
import { FeaturedCommentContainer_viewer as ViewerData } from "coral-stream/__generated__/FeaturedCommentContainer_viewer.graphql";

import { UserTagsContainer } from "../../Comment";
import MediaSectionContainer from "../../Comment/MediaSection";
import ReactionButtonContainer from "../../Comment/ReactionButton";
import { UsernameWithPopoverContainer } from "../../Comment/Username";
import IgnoredTombstoneOrHideContainer from "../../IgnoredTombstoneOrHideContainer";

import FeaturedBy from "./FeaturedBy";

import styles from "./FeaturedCommentContainer.css";
import commentStyles from "../../Comment/IndentedComment.css";

interface Props {
  viewer: ViewerData | null;
  comment: CommentData;
  story: StoryData;
  settings: SettingsData;
}

const FeaturedCommentContainer: FunctionComponent<Props> = (props) => {
  const { comment, settings, story, viewer } = props;
  const setCommentID = useMutation(SetCommentIDMutation);
  const isViewerBanned = !!viewer?.status.current.includes(
    GQLUSER_STATUS.BANNED
  );
  const isViewerSuspended = !!viewer?.status.current.includes(
    GQLUSER_STATUS.SUSPENDED
  );
  const isViewerWarned = !!viewer?.status.current.includes(
    GQLUSER_STATUS.WARNED
  );
  const isRatingsAndReviews =
    story.settings.mode === GQLSTORY_MODE.RATINGS_AND_REVIEWS;

  const emitViewConversationEvent = useViewerEvent(ViewConversationEvent);
  const onGotoConversation = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      emitViewConversationEvent({
        from: "FEATURED_COMMENTS",
        commentID: comment.id,
      });
      void setCommentID({ id: comment.id });
      return false;
    },
    [emitViewConversationEvent, comment.id, setCommentID]
  );

  const featuringUser = comment.tags.find(
    (tag) => tag.code === GQLTAG.FEATURED
  )?.createdBy;

  const gotoConvAriaLabelId = comment.author?.username
    ? "comments-featured-gotoConversation-label-with-username"
    : "comments-featured-gotoConversation-label-without-username";

  return (
    <IgnoredTombstoneOrHideContainer viewer={props.viewer} comment={comment}>
      <div className={styles.container}>
        <Flex spacing={3}>
          {comment.author && comment.author.username ? (
            <div className={commentStyles.userAvatar}>
              <span>{comment.author.username[0]}</span>
            </div>
          ) : null}

          <article
            className={cn(CLASSES.featuredComment.$root, styles.root)}
            data-testid={`featuredComment-${comment.id}`}
            aria-labelledby={`featuredComment-${comment.id}-label`}
          >
            <Flex
              direction="row"
              alignItems="center"
              className={cn(
                CLASSES.featuredComment.authorBar.$root,
                styles.authorContainer
              )}
            >
              {comment.author && (
                <UsernameWithPopoverContainer
                  className={CLASSES.featuredComment.authorBar.username}
                  usernameClassName={styles.username}
                  comment={comment}
                  viewer={viewer}
                  settings={settings}
                />
              )}
              <Box container="span">
                <UserTagsContainer
                  className={CLASSES.featuredComment.authorBar.userTag}
                  story={story}
                  comment={comment}
                  settings={settings}
                />
              </Box>
              <Box ml={1}>
                <Timestamp
                  className={CLASSES.featuredComment.authorBar.timestamp}
                >
                  {comment.createdAt}
                </Timestamp>
              </Box>
            </Flex>
            <Localized
              id="comments-featured-label"
              elems={{
                RelativeTime: <RelativeTime date={comment.createdAt} />,
              }}
              vars={{ username: comment.author?.username ?? "" }}
            >
              <Hidden id={`featuredComment-${comment.id}-label`}>
                Featured Comment from {comment.author?.username} {` `}
                <RelativeTime date={comment.createdAt} />
              </Hidden>
            </Localized>
            <HorizontalGutter className={styles.contentContainer}>
              {settings.featuredBy && featuringUser?.username && (
                <FeaturedBy username={featuringUser.username} />
              )}
              {isRatingsAndReviews && comment.rating && (
                <StarRating rating={comment.rating} />
              )}
              <HTMLContent
                className={cn(styles.body, CLASSES.featuredComment.content)}
              >
                {comment.body || ""}
              </HTMLContent>
              <MediaSectionContainer
                comment={comment}
                settings={settings}
                defaultExpanded={viewer?.mediaSettings?.unfurlEmbeds}
              />
            </HorizontalGutter>
            <Flex
              justifyContent="space-between"
              className={CLASSES.featuredComment.actionBar.$root}
            >
              <ReactionButtonContainer
                comment={comment}
                settings={settings}
                viewer={viewer}
                readOnly={
                  isViewerBanned ||
                  isViewerSuspended ||
                  isViewerWarned ||
                  story.isArchived ||
                  story.isArchiving
                }
                className={CLASSES.featuredComment.actionBar.reactButton}
                reactedClassName={
                  CLASSES.featuredComment.actionBar.reactedButton
                }
              />
              <Flex alignItems="center">
                {comment.replyCount > 0 && (
                  <Flex
                    alignItems="center"
                    className={cn(
                      styles.replies,
                      CLASSES.featuredComment.actionBar.replies
                    )}
                  >
                    <SvgIcon Icon={CommentBoxIcon} />
                    <Box mx={1}>{comment.replyCount}</Box>
                    <Localized id="comments-featured-replies">
                      <Box>Replies</Box>
                    </Localized>
                  </Flex>
                )}
                <Flex alignItems="center">
                  <Localized
                    id={gotoConvAriaLabelId}
                    attrs={{ "aria-label": true }}
                    vars={{ username: comment.author?.username ?? "" }}
                  >
                    <Button
                      className={cn(
                        CLASSES.featuredComment.actionBar.goToConversation,
                        styles.gotoConversation
                      )}
                      variant="flat"
                      fontSize="small"
                      color="none"
                      paddingSize="none"
                      onClick={onGotoConversation}
                      href={getURLWithCommentID(story.url, comment.id)}
                    >
                      <SvgIcon
                        Icon={ConversationChatIcon}
                        className={styles.icon}
                      />
                      <Localized id="comments-featured-gotoConversation">
                        <span>Go to conversation</span>
                      </Localized>
                    </Button>
                  </Localized>
                </Flex>
              </Flex>
            </Flex>
          </article>
        </Flex>
      </div>
    </IgnoredTombstoneOrHideContainer>
  );
};

const enhanced = withFragmentContainer<Props>({
  viewer: graphql`
    fragment FeaturedCommentContainer_viewer on User {
      id
      status {
        current
      }
      ignoredUsers {
        id
      }
      mediaSettings {
        unfurlEmbeds
      }
      role
      ...UsernameWithPopoverContainer_viewer
      ...ReactionButtonContainer_viewer
      ...IgnoredTombstoneOrHideContainer_viewer
    }
  `,
  story: graphql`
    fragment FeaturedCommentContainer_story on Story {
      url
      commentCounts {
        tags {
          FEATURED
        }
      }
      settings {
        mode
      }
      isArchiving
      isArchived
      ...UserTagsContainer_story
    }
  `,
  comment: graphql`
    fragment FeaturedCommentContainer_comment on Comment {
      id
      author {
        id
        username
      }
      parent {
        author {
          username
        }
      }
      tags {
        code
        createdBy {
          username
        }
      }
      rating
      body
      createdAt
      lastViewerAction
      replyCount
      ...UsernameWithPopoverContainer_comment
      ...ReactionButtonContainer_comment
      ...MediaSectionContainer_comment
      ...UserTagsContainer_comment
      ...IgnoredTombstoneOrHideContainer_comment
    }
  `,
  settings: graphql`
    fragment FeaturedCommentContainer_settings on Settings {
      featuredBy
      ...ReactionButtonContainer_settings
      ...UserTagsContainer_settings
      ...MediaSectionContainer_settings
      ...UsernameWithPopoverContainer_settings
    }
  `,
})(FeaturedCommentContainer);

export default enhanced;
