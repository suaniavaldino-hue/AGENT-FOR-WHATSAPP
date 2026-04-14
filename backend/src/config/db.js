export function mapConnection(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    userId: String(row.userid ?? row.userId),
    userName: row.username ?? row.userName ?? '',
    connectionName: row.connectionname ?? row.connectionName,
    mode: row.mode,
    status: row.status,
    phoneNumber: row.phonenumber ?? row.phoneNumber,
    qrCode: row.qrcode ?? row.qrCode,
    pairingCode: row.pairingcode ?? row.pairingCode,
    webhookUrl: row.webhookurl ?? row.webhookUrl,
    connectedAt: row.connectedat ?? row.connectedAt ?? '',
    notes: row.notes ?? '',
    createdAt: row.createdat ?? row.createdAt,
    updatedAt: row.updatedat ?? row.updatedAt
  };
}
