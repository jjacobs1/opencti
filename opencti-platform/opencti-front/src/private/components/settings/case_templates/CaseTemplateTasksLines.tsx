import React, { FunctionComponent } from 'react';
import { graphql, PreloadedQuery } from 'react-relay';
import { DataColumns } from '../../../../components/list_lines';
import ListLinesContent from '../../../../components/list_lines/ListLinesContent';
import { UseLocalStorageHelpers } from '../../../../utils/hooks/useLocalStorage';
import usePreloadedPaginationFragment from '../../../../utils/hooks/usePreloadedPaginationFragment';
import { CaseTemplateTasksLines_data$key } from './__generated__/CaseTemplateTasksLines_data.graphql';
import { CaseTemplateTasksLines_DataQuery, CaseTemplateTasksLines_DataQuery$variables } from './__generated__/CaseTemplateTasksLines_DataQuery.graphql';
import { CaseTemplateTasksLinesPaginationQuery } from './__generated__/CaseTemplateTasksLinesPaginationQuery.graphql';
import { CaseTemplateTasksLine, CaseTemplateTasksLineDummy } from './CaseTemplateTasksLine';

export interface TasksLinesProps {
  paginationOptions: CaseTemplateTasksLines_DataQuery$variables;
  dataColumns: DataColumns;
  queryRef: PreloadedQuery<CaseTemplateTasksLinesPaginationQuery>;
  setNumberOfElements: UseLocalStorageHelpers['handleSetNumberOfElements'];
}

export const tasksLinesQuery = graphql`
  query CaseTemplateTasksLinesPaginationQuery(
    $search: String
    $count: Int
    $orderMode: OrderingMode
    $orderBy: CaseTasksOrdering
    $filters: [CaseTasksFiltering!]
  ) {
    
    ...CaseTemplateTasksLines_data
    @arguments(
      search: $search
      count: $count
      orderMode: $orderMode
      orderBy: $orderBy
      filters: $filters
    )
  }
`;

export const tasksLinesFragment = graphql`
  fragment CaseTemplateTasksLines_data on Query
  @argumentDefinitions(
    filters: { type: "[CaseTasksFiltering!]" }
    search: { type: "String" }
    count: { type: "Int", defaultValue: 200 }
    orderMode: { type: "OrderingMode", defaultValue: asc }
    orderBy: { type: "CaseTasksOrdering", defaultValue: name }
    after: { type: "ID", defaultValue: "" }
  )
  @refetchable(queryName: "CaseTemplateTasksLines_DataQuery") {
    caseTasks(
      filters: $filters
      search: $search
      first: $count
      orderMode: $orderMode
      orderBy: $orderBy
      after: $after
    ) @connection(key: "Pagination_caseTemplate__caseTasks") {
      edges {
        node {
          id
          name
          ...CaseTemplateTasksLine_node
        }
      }
      pageInfo {
        endCursor
        hasNextPage
        globalCount
      }
    }
  }
`;

const CaseTemplateTasksLines: FunctionComponent<TasksLinesProps> = ({
  queryRef,
  dataColumns,
  paginationOptions,
  setNumberOfElements,
}) => {
  const {
    data,
    hasMore,
    loadMore,
    isLoadingMore,
  } = usePreloadedPaginationFragment<CaseTemplateTasksLines_DataQuery, CaseTemplateTasksLines_data$key>({
    queryRef,
    linesQuery: tasksLinesQuery,
    linesFragment: tasksLinesFragment,
    nodePath: ['caseTasks', 'pageInfo', 'globalCount'],
    setNumberOfElements,
  });

  const tasks = data?.caseTasks?.edges ?? [];
  const globalCount = data?.caseTasks?.pageInfo?.globalCount;

  return (
    <>
      <ListLinesContent
        initialLoading={!data}
        loadMore={loadMore}
        hasMore={hasMore}
        isLoading={isLoadingMore}
        dataList={tasks}
        globalCount={globalCount}
        LineComponent={CaseTemplateTasksLine}
        DummyLineComponent={CaseTemplateTasksLineDummy}
        dataColumns={dataColumns}
        nbOfRowsToLoad={10}
        paginationOptions={paginationOptions}
      />
    </>
  );
};

export default CaseTemplateTasksLines;
