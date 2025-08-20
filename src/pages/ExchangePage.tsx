import React from 'react'
import { useParams } from 'react-router-dom'
import Chat from '../components/Chat'

const ExchangePage: React.FC = () => {
  const { exchangeId } = useParams<{ exchangeId: string }>()

  return (
    <div>
      {/* Exchange details here */}
      <Chat chatId={`exchange-${exchangeId}`} />
    </div>
  )
}

export default ExchangePage
