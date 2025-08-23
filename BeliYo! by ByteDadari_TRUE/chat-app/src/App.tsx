import React from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import Navigation from './components/Navigation'

const App: React.FC = () => {
  return (
    <Router>
      <Navigation />
      <Switch>
        <Route path="/chat" component={ChatPage} />
        {/* Add other routes here */}
      </Switch>
    </Router>
  )
}

export default App
