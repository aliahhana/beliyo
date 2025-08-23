import React from 'react'
import { useParams } from 'react-router-dom'
import Chat from '../components/Chat'

const ProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>()

  return (
    <div>
      {/* Product details here */}
      <Chat chatId={`product-${productId}`} />
    </div>
  )
}

export default ProductPage
