import { Hooks } from '@/generated/hooks'
import { Mutator } from '@/generated/mutator'
import { routerService } from '@/generated/routerService'
import React from 'react'

export default () => {
  const { data } = Hooks.useUser({ id: 1 })
  return (
    <div>
      <h2 onClick={() => routerService.toUser({ id: 10 })}>gql</h2>
      <button
        onClick={() => {
          Mutator.mutateUser((user) => {
            user.id = 100
            user.name = 'foo'
          })
        }}
      >
        Update user
      </button>
      <pre className="App">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
