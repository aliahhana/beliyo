import React from 'react'
import { checkIsPublic } from '../utils/checkIsPublic'

const SomeComponent: React.FC<{ data: any }> = ({ data }) => {
  const isPublic = checkIsPublic(data)

  return (
    <div>
      <p>{isPublic ? 'This is public' : 'This is private'}</p>
    </div>
  )
}

export default SomeComponent
