import { type Role, createAccessControl } from 'better-auth/plugins/access'
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access'

type Roles = { [key in string]: Role }

const statement = {
  ...defaultStatements,
  project: ['create', 'update', 'delete'],
} as const

const ac = createAccessControl(statement)

const owner = ac.newRole({
  ...ownerAc.statements,
  project: ['create', 'update', 'delete'],
})

const admin = ac.newRole({
  ...adminAc.statements,
  project: ['create', 'update'],
})

const member = ac.newRole({
  ...memberAc.statements,
  project: ['create'],
})

const roles: Roles = {
  owner,
  admin,
  member,
}

export { statement, ac, roles }
