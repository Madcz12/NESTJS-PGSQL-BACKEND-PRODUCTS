import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { isUUID } from 'class-validator';


@Injectable()
export class ProductsService { // las interacciones con la base de datos son asíncronas

  // hacemos uso de los logs propios de Nest

  private readonly logger = new Logger('ProductsService');


  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

  ){}

  async create(createProductDto: CreateProductDto) {
    
    try {
      
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);

      return product;

    } catch (error) {

      this.handleDBErrorExceptions(error);
      
    }

  }
  // TODO: paginar
  findAll(paginationDto: PaginationDto) {

    const { limit = 10, offset=0 } = paginationDto;

    return this.productRepository.find({
      take: limit,
      skip: offset,
      // TODO: relaciones
    });
  }

  async findOne(term: string) {

    let product: Product | null = null;
    
    if(isUUID(term)){
      product = await this.productRepository.findOneBy({id: term});
    }else{
      const queryBuilder = this.productRepository.createQueryBuilder();
      // buscar solo un producto ya que el termino solo busca uno a la vez 
      product = await queryBuilder
      .where(`LOWER(title) = LOWER(:term) OR LOWER(slug) = LOWER(:term)`, {
        term: term.toLowerCase()
      }).getOne();
    }

    //const product = await this.productRepository.findOneBy({id});

    if(!product) throw new NotFoundException(`Product with id ${term} not found`);

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const product = await this.productRepository.preload({
      id: id, 
      ...updateProductDto
    });

    if(!product) throw new NotFoundException(`Product with id: ${id} not found`);

    try {

      await this.productRepository.save(product);
    
      return product;

    } catch (error) {

      this.handleDBErrorExceptions(error);
      
    }

  }

  async remove(id: string) {

    const product = await this.findOne(id);

    await this.productRepository.remove(product);
  }

  private handleDBErrorExceptions(error: any){
    if(error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error check server logs!');
  }
}
