import _ from "lodash";

/**
 * Removes all keys and values from an object that match the given predicate.
 * @param obj The object to remove from.
 * @param predicate The predicate function.
 * @returns The object with the removed keys and values.
 */
export function deepRemoveBy<T extends Record<string, any>>(
  obj: T,
  predicate: (key: string, value: unknown) => boolean
): T {
  const newObj = _.cloneDeep(obj);

  for (const key in newObj) {
    if (predicate(key, newObj[key])) {
      delete newObj[key];
    } else if (typeof newObj[key] === "object") {
      newObj[key] = deepRemoveBy(newObj[key], predicate);
    }
  }

  return newObj;
}
