import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribeTreeMembers, type TreeMember } from '../lib/familyTreeMembers'
import {
  inferSiblingRelationship,
  parentMetaFromMembers,
  resolveUserParentLinks,
  sharedParentsIncludeStepParent,
  siblingRelationshipLabel,
  type ParentLinkIds,
} from '../lib/siblingRelationship'
import { fetchUserProfile } from '../lib/userProfile'

export function useSiblingRelationshipPreview(
  enabled: boolean,
  shared: ParentLinkIds,
  siblingGender: string,
) {
  const { user } = useAuth()
  const [members, setMembers] = useState<TreeMember[]>([])
  const [userParents, setUserParents] = useState<ParentLinkIds>({})

  useEffect(() => {
    if (!enabled || !user?.uid) {
      setMembers([])
      return
    }
    return subscribeTreeMembers(user.uid, setMembers)
  }, [enabled, user?.uid])

  useEffect(() => {
    if (!enabled || !user?.uid) {
      setUserParents({})
      return
    }
    let cancelled = false
    ;(async () => {
      const profile = await fetchUserProfile(user.uid)
      if (cancelled) return
      const parentMeta = parentMetaFromMembers(members)
      setUserParents(
        resolveUserParentLinks(
          {
            treeFatherMemberId: profile?.treeFatherMemberId,
            treeMotherMemberId: profile?.treeMotherMemberId,
          },
          parentMeta,
        ),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, members, user?.uid])

  const { relationship, stepParentSelected } = useMemo(() => {
    const parentMeta = parentMetaFromMembers(members)
    const metaMap = new Map(parentMeta.map((p) => [p.id, p]))
    return {
      relationship: inferSiblingRelationship(siblingGender, shared, userParents, metaMap),
      stepParentSelected: sharedParentsIncludeStepParent(shared, metaMap),
    }
  }, [members, shared, siblingGender, userParents])

  const label = siblingRelationshipLabel(relationship)

  return { relationship, label, userParents, stepParentSelected }
}
