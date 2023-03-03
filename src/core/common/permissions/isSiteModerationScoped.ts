export interface UserModerationScopes {
  scoped?: boolean | null;
  siteIDs?: Readonly<string[]> | null;
  sites?: Readonly<any[]> | null;
}

export function isSiteModerationScoped(
  moderationScopes?: Readonly<UserModerationScopes> | null
): moderationScopes is Required<UserModerationScopes> {
  const scopeSites = moderationScopes?.siteIDs || moderationScopes?.sites;
  /* eslint-disable */
  console.log("isSiteModerationScoped", { scopeSites, moderationScopes });

  return moderationScopes?.scoped || (!!scopeSites && scopeSites.length > 0);
}
