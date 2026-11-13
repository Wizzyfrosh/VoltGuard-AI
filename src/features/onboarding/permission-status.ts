export type PermissionReadResult<T> = {
  value: T | null;
  failed: boolean;
};

/**
 * Read one permission independently. A failed native bridge call is unknown,
 * not equivalent to a user denying permission.
 */
export async function readPermissionStatus<T>(
  read: () => Promise<T>,
): Promise<PermissionReadResult<T>> {
  try {
    return { value: await read(), failed: false };
  } catch {
    return { value: null, failed: true };
  }
}
