import { Localized } from "@fluent/react/compat";
import React, { FunctionComponent, useCallback, useState } from "react";
import { graphql, RelayPaginationProp } from "react-relay";

import parseModerationOptions from "coral-framework/helpers/parseModerationOptions";
import { IntersectionProvider } from "coral-framework/lib/intersection";
import {
  LOCAL_ID,
  lookup,
  useLocal,
  useRefetch,
  withPaginationContainer,
} from "coral-framework/lib/relay";
import { createRouteConfig } from "coral-framework/lib/router";
import { GQLCOMMENT_SORT_RL } from "coral-framework/schema";

import { RejectedQueueRoute_query } from "coral-admin/__generated__/RejectedQueueRoute_query.graphql";
import { RejectedQueueRouteLocal } from "coral-admin/__generated__/RejectedQueueRouteLocal.graphql";
import {
  RejectedQueueRoutePaginationQueryVariables,
  SectionFilter,
} from "coral-admin/__generated__/RejectedQueueRoutePaginationQuery.graphql";

import EmptyMessage from "./EmptyMessage";
import LoadingQueue from "./LoadingQueue";
import Queue from "./Queue";

interface Props {
  query: RejectedQueueRoute_query;
  relay: RelayPaginationProp;
  storyID?: string | null;
  siteID?: string | null;
  section?: SectionFilter | null;
}

// TODO: use generated types
const danglingLogic = (status: string) => ["APPROVED"].includes(status);

export const RejectedQueueRoute: FunctionComponent<Props> = (props) => {
  const [disableLoadMore, setDisableLoadMore] = useState(false);

  const [{ moderationQueueSort }] = useLocal<RejectedQueueRouteLocal>(graphql`
    fragment RejectedQueueRouteLocal on Local {
      moderationQueueSort
    }
  `);

  const [, isRefetching] = useRefetch<
    RejectedQueueRoutePaginationQueryVariables
  >(props.relay, {
    orderBy: moderationQueueSort as GQLCOMMENT_SORT_RL,
    count: 5,
  });

  const loadMore = useCallback(() => {
    if (!props.relay.hasMore() || props.relay.isLoading()) {
      return;
    }

    setDisableLoadMore(true);

    props.relay.loadMore(
      10, // Fetch the next 10 feed items
      (error: any) => {
        setDisableLoadMore(false);

        if (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }
    );
  }, [props.relay]);

  if (!props.query || !props.query.viewer) {
    return null;
  }

  if (isRefetching) {
    return <LoadingQueue />;
  }

  const comments = props.query.comments.edges.map(
    (edge: { node: any }) => edge.node
  );

  return (
    <IntersectionProvider>
      <Queue
        settings={props.query.settings}
        viewer={props.query.viewer}
        comments={comments}
        onLoadMore={loadMore}
        hasLoadMore={props.relay.hasMore()}
        disableLoadMore={disableLoadMore}
        danglingLogic={danglingLogic}
        emptyElement={
          <Localized id="moderate-emptyQueue-rejected">
            <EmptyMessage>There are no rejected comments.</EmptyMessage>
          </Localized>
        }
        allStories={!props.storyID}
      />
    </IntersectionProvider>
  );
};

// TODO: (cvle) If this could be autogenerated..
type FragmentVariables = RejectedQueueRoutePaginationQueryVariables;

const enhanced = withPaginationContainer<
  Props,
  RejectedQueueRoutePaginationQueryVariables,
  FragmentVariables
>(
  {
    query: graphql`
      fragment RejectedQueueRoute_query on Query
        @argumentDefinitions(
          count: { type: "Int!", defaultValue: 5 }
          cursor: { type: "Cursor" }
          storyID: { type: "ID" }
          siteID: { type: "ID" }
          section: { type: "SectionFilter" }
          orderBy: { type: "COMMENT_SORT", defaultValue: CREATED_AT_DESC }
        ) {
        comments(
          status: REJECTED
          storyID: $storyID
          siteID: $siteID
          section: $section
          first: $count
          after: $cursor
          orderBy: $orderBy
        ) @connection(key: "RejectedQueue_comments", filters: []) {
          edges {
            node {
              id
              ...ModerateCardContainer_comment
            }
          }
        }
        settings {
          ...ModerateCardContainer_settings
        }
        viewer {
          ...ModerateCardContainer_viewer
        }
      }
    `,
  },
  {
    direction: "forward",
    getConnectionFromProps(props) {
      return props.query && props.query.comments;
    },
    // This is also the default implementation of `getFragmentVariables` if it isn't provided.
    getFragmentVariables(prevVars, totalCount) {
      return {
        ...prevVars,
        count: totalCount,
      };
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        ...fragmentVariables,
        count,
        cursor,
      };
    },
    query: graphql`
      # Pagination query to be fetched upon calling 'loadMore'.
      # Notice that we re-use our fragment, and the shape of this query matches our fragment spec.
      query RejectedQueueRoutePaginationQuery(
        $storyID: ID
        $siteID: ID
        $section: SectionFilter
        $count: Int!
        $cursor: Cursor
        $orderBy: COMMENT_SORT
      ) {
        ...RejectedQueueRoute_query
          @arguments(
            storyID: $storyID
            siteID: $siteID
            section: $section
            count: $count
            cursor: $cursor
            orderBy: $orderBy
          )
      }
    `,
  }
)(RejectedQueueRoute);

export const routeConfig = createRouteConfig<Props, RejectedQueueRoute_query>({
  Component: enhanced,
  query: graphql`
    query RejectedQueueRouteQuery(
      $storyID: ID
      $siteID: ID
      $section: SectionFilter
      $initialOrderBy: COMMENT_SORT
    ) {
      ...RejectedQueueRoute_query
        @arguments(
          storyID: $storyID
          siteID: $siteID
          section: $section
          orderBy: $initialOrderBy
        )
    }
  `,
  prepareVariables: (params, match) => {
    const initialOrderBy = lookup(match.context.relayEnvironment, LOCAL_ID)!
      .moderationQueueSort;
    return {
      ...params,
      initialOrderBy,
      count: 5,
    };
  },
  cacheConfig: { force: true },
  // eslint-disable-next-line react/display-name
  render: ({ Component, data, match }) => {
    if (Component && data) {
      const { storyID, siteID, section } = parseModerationOptions(match);
      return (
        <Component
          query={data}
          storyID={storyID}
          siteID={siteID}
          section={section}
        />
      );
    }
    return <LoadingQueue />;
  },
});

export default enhanced;
