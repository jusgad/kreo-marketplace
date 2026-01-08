import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWebhookFailuresTable1704500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_failures',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'stripe_event_id',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'payload',
            type: 'jsonb',
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_stack',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'failed'",
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'last_retry_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'source_ip',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'request_headers',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Índices
    await queryRunner.createIndex(
      'webhook_failures',
      new TableIndex({
        name: 'IDX_webhook_failures_stripe_event_id',
        columnNames: ['stripe_event_id'],
      })
    );

    await queryRunner.createIndex(
      'webhook_failures',
      new TableIndex({
        name: 'IDX_webhook_failures_event_type_status',
        columnNames: ['event_type', 'status'],
      })
    );

    await queryRunner.createIndex(
      'webhook_failures',
      new TableIndex({
        name: 'IDX_webhook_failures_created_at',
        columnNames: ['created_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_failures');
  }
}
