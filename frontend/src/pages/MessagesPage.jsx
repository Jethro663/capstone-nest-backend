import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const MessagesPage = () => {
  return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No messages yet</p>
          </CardContent>
        </Card>
      </div>
  )
}

export default MessagesPage
