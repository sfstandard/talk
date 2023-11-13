import { Localized } from "@fluent/react/compat";
import React, { FunctionComponent, useCallback, useState } from "react";
import { graphql, RelayPaginationProp } from "react-relay";

import { useRefetch, withPaginationContainer } from "coral-framework/lib/relay";
import CLASSES from "coral-stream/classes";
import Spinner from "coral-stream/common/Spinner";
import { Button } from "coral-ui/components/v3";

import { NotificationsPaginator_query } from "coral-stream/__generated__/NotificationsPaginator_query.graphql";
import { NotificationsPaginatorPaginationQueryVariables } from "coral-stream/__generated__/NotificationsPaginatorPaginationQuery.graphql";

import NotificationContainer from "./NotificationContainer";

interface Props {
  query: NotificationsPaginator_query;
  relay: RelayPaginationProp;
  viewerID: string;
}

const NotificationsPaginator: FunctionComponent<Props> = (props) => {
  const [disableLoadMore, setDisableLoadMore] = useState(false);

  const [, isRefetching] =
    useRefetch<NotificationsPaginatorPaginationQueryVariables>(
      props.relay,
      10,
      { viewerID: props.viewerID }
    );

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

  return (
    <div>
      {props.query.notifications.edges.map(({ node }) => {
        return (
          <NotificationContainer
            key={node.id}
            notification={node}
            viewer={props.query.viewer}
          />
        );
      })}
      {isRefetching && <Spinner />}
      {!isRefetching && !disableLoadMore && props.relay.hasMore() && (
        <Localized id="notifications-loadMore">
          <Button
            key={props.query.notifications.edges.length}
            onClick={loadMore}
            variant="outlined"
            color="secondary"
            fullWidth
            disabled={disableLoadMore}
            aria-controls="notifications-loadMore"
            className={CLASSES.tabBarNotifications.loadMore}
          >
            Load More
          </Button>
        </Localized>
      )}
    </div>
  );
};

type FragmentVariables = NotificationsPaginatorPaginationQueryVariables;

const enhanced = withPaginationContainer<
  Props,
  NotificationsPaginatorPaginationQueryVariables,
  FragmentVariables
>(
  {
    query: graphql`
      fragment NotificationsPaginator_query on Query
      @argumentDefinitions(
        count: { type: "Int", defaultValue: 10 }
        cursor: { type: "Cursor" }
        viewerID: { type: "ID!" }
      ) {
        viewer {
          ...NotificationContainer_viewer
        }
        notifications(ownerID: $viewerID, after: $cursor, first: $count)
          @connection(key: "NotificationsPaginator_notifications") {
          edges {
            node {
              id
              ...NotificationContainer_notification
            }
          }
        }
      }
    `,
  },
  {
    getConnectionFromProps(props) {
      return props.query && props.query.notifications;
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        ...fragmentVariables,
        count,
        cursor,
        viewerID: props.viewerID,
      };
    },
    query: graphql`
      # Pagination query to be fetched upon calling 'loadMore'.
      # Notice that we re-use our fragment, and the shape of this query matches our fragment spec.
      query NotificationsPaginatorPaginationQuery(
        $viewerID: ID!
        $cursor: Cursor
        $count: Int!
      ) {
        ...NotificationsPaginator_query
          @arguments(viewerID: $viewerID, count: $count, cursor: $cursor)
      }
    `,
  }
)(NotificationsPaginator);

export default enhanced;