export function getSourceProjectAdminIds(sourceProject) {
  return Array.isArray(sourceProject?.admins) ? sourceProject.admins : [];
}

export function canManageSourceProject(sourceProject, user) {
  if (!sourceProject || !user?.uid) return false;

  return (
    user.admin === true ||
    sourceProject.sourceOwner === user.uid ||
    getSourceProjectAdminIds(sourceProject).includes(user.uid)
  );
}
