import type { UserJSON } from '@clerk/backend';

export function clerkUserJsonToSyncParams(data: UserJSON) {
  let email = '';
  if (data.primary_email_address_id) {
    const p = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    );
    if (p) email = p.email_address;
  }
  if (!email && data.email_addresses[0]) {
    email = data.email_addresses[0].email_address;
  }
  if (!email) email = 'pending@user.local';

  const full = [data.first_name, data.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const name = full || data.username || 'User';

  return {
    clerkId: data.id,
    email,
    name,
    avatarUrl: data.has_image ? data.image_url : undefined,
  };
}
