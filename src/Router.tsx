import {
  createSignal,
  createMemo,
  useContext,
  onCleanup,
  awaitSuspense,
  sample,
} from 'solid-js';
import { match } from 'path-to-regexp';

import getArrayOf from './helpers/getArrayOf';
import { HistoryContext } from './ContextProvider';
import { RouteContext } from './RouteContext';

function createRouteHandler() {
  const history = useContext(HistoryContext);

  const [location, setLocation] = createSignal(history.location);

  const locationHandler = history.listen((location, action) => {
    setLocation(location);
  });
  onCleanup(() => locationHandler());
  return route => {
    const matcher = match(route.path, route.options);
    return () => {
      return matcher(location().pathname);
    };
  };
}

interface RouterProps {
  fallback: any;
  children: any;
}

export default function Router(props: RouterProps) {
  const createMatcher = createRouteHandler();
  const routes = getArrayOf(props.children);
  const matchers = routes.map(createMatcher);
  const useFallback = 'fallback' in props;
  const evalConditions = createMemo(() =>
    matchers.reduce(
      (result, matcher, index) => {
        if (result.index === -1) {
          const match = matcher();
          if (match) {
            return {
              index,
              params: match.params,
            };
          }
        }
        return result;
      },
      {
        index: -1,
        params: {},
      },
    ),
  );
  return awaitSuspense(
    createMemo(() => {
      const { index, params } = evalConditions();
      return sample(() => (
        <RouteContext.Provider value={params}>
          {index < 0 ? useFallback && props.fallback : routes[index].children}
        </RouteContext.Provider>
      ));
    }),
  );
}
