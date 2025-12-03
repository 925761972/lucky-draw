export type Prize = {
  id: string
  name: string
  quantity: number
  weight?: number
  createdAt: number
}

export type Participant = {
  id: string
  name: string
  meta?: Record<string, string>
}

export type DrawMode = 'single' | 'batch'

export type DrawRecord = {
  id: string
  prizeId: string
  prizeName?: string
  participantId: string
  timestamp: number
  mode: DrawMode
  roundId?: string
  roundIndex?: number
  seed?: string
}

export type StoreSnapshot = {
  prizes: Prize[]
  participants: Participant[]
  records: DrawRecord[]
  deletedPrizes?: Record<string, boolean>
}