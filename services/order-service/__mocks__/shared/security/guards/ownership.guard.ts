export class OwnershipChecker {
  static async checkOwnership(repository: any, id: string, userId: string, options?: any) {
    const entity = await repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error('Entity not found');
    }
    if (entity.user_id !== userId && (!options?.allowAdmin || options?.userRole !== 'admin')) {
      throw new Error('Unauthorized');
    }
    return entity;
  }
}
