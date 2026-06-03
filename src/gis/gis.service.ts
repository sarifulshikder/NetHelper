// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PopDevice, PopStatus } from './entities/pop-device.entity';
import { Zone } from './entities/zone.entity';
import { FiberJointBox, FiberJointBoxStatus } from './entities/fiber-joint-box.entity';
import { FiberCable, FiberCableSourceType, FiberCableDestinationType, FiberCableStatus } from './entities/fiber-cable.entity';
import { Customer } from '../crm/entities/customer.entity';

interface Coordinates {
  lat: number;
  long: number;
}

interface FiberPathNode {
  id: string;
  name: string;
  type: 'POP' | 'JOINT_BOX' | 'CUSTOMER';
  lat: number;
  long: number;
  distanceFromPrevious?: number;
}

interface FiberTraceResult {
  path: FiberPathNode[];
  totalDistanceMeters: number;
  totalHops: number;
}

@Injectable()
export class GisService {
  constructor(
    @InjectRepository(PopDevice)
    private popRepository: Repository<PopDevice>,
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
    @InjectRepository(FiberJointBox)
    private jointBoxRepository: Repository<FiberJointBox>,
    @InjectRepository(FiberCable)
    private cableRepository: Repository<FiberCable>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  // Haversine formula to calculate distance between two points in meters
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Earth radius in meters
    const φ1 = coord1.lat * Math.PI / 180;
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.long - coord1.long) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Create a new POP device
  async createPop(data: {
    name: string;
    location_lat: number;
    location_long: number;
    address: string;
    total_capacity_cores: number;
    status?: PopStatus;
    notes?: string;
  }): Promise<PopDevice> {
    const pop = this.popRepository.create(data);
    return await this.popRepository.save(pop);
  }

  // Create a new zone
  async createZone(data: {
    name: string;
    description?: string;
    pop_id: string;
  }): Promise<Zone> {
    const pop = await this.popRepository.findOne({ where: { id: data.pop_id } });
    if (!pop) {
      throw new NotFoundException('POP not found');
    }

    const zone = this.zoneRepository.create(data);
    return await this.zoneRepository.save(zone);
  }

  // Create a new fiber joint box
  async createJointBox(data: {
    pop_id: string;
    name: string;
    location_lat: number;
    location_long: number;
    total_ports: number;
    used_ports?: number;
    status?: FiberJointBoxStatus;
  }): Promise<FiberJointBox> {
    const pop = await this.popRepository.findOne({ where: { id: data.pop_id } });
    if (!pop) {
      throw new NotFoundException('POP not found');
    }

    const jointBox = this.jointBoxRepository.create(data);
    return await this.jointBoxRepository.save(jointBox);
  }

  // Create a new fiber cable
  async createFiberCable(data: {
    name: string;
    source_type: FiberCableSourceType;
    source_id: string;
    destination_type: FiberCableDestinationType;
    destination_id: string;
    total_cores: number;
    color_code?: string;
    length_meters?: number;
    status?: FiberCableStatus;
  }): Promise<FiberCable> {
    // Validate source
    if (data.source_type === FiberCableSourceType.POP) {
      const sourcePop = await this.popRepository.findOne({ where: { id: data.source_id } });
      if (!sourcePop) {
        throw new NotFoundException('Source POP not found');
      }
    } else if (data.source_type === FiberCableSourceType.JOINT_BOX) {
      const sourceJointBox = await this.jointBoxRepository.findOne({ where: { id: data.source_id } });
      if (!sourceJointBox) {
        throw new NotFoundException('Source Joint Box not found');
      }
    }

    // Validate destination
    if (data.destination_type === FiberCableDestinationType.POP) {
      const destPop = await this.popRepository.findOne({ where: { id: data.destination_id } });
      if (!destPop) {
        throw new NotFoundException('Destination POP not found');
      }
    } else if (data.destination_type === FiberCableDestinationType.JOINT_BOX) {
      const destJointBox = await this.jointBoxRepository.findOne({ where: { id: data.destination_id } });
      if (!destJointBox) {
        throw new NotFoundException('Destination Joint Box not found');
      }
    } else if (data.destination_type === FiberCableDestinationType.CUSTOMER) {
      const customer = await this.customerRepository.findOne({ where: { id: data.destination_id } });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Auto-calculate length if not provided
    if (!data.length_meters) {
      const sourceCoords = await this.getEntityCoordinates(data.source_type, data.source_id);
      const destCoords = await this.getEntityCoordinates(data.destination_type, data.destination_id);
      data.length_meters = this.calculateDistance(sourceCoords, destCoords);
    }

    const cable = this.cableRepository.create(data);
    return await this.cableRepository.save(cable);
  }

  // Get coordinates for any entity type
  private async getEntityCoordinates(type: FiberCableSourceType | FiberCableDestinationType, id: string): Promise<Coordinates> {
    if (type === FiberCableSourceType.POP || type === FiberCableDestinationType.POP) {
      const pop = await this.popRepository.findOne({ where: { id } });
      if (!pop) throw new NotFoundException('POP not found');
      return { lat: pop.location_lat, long: pop.location_long };
    } else if (type === FiberCableSourceType.JOINT_BOX || type === FiberCableDestinationType.JOINT_BOX) {
      const jointBox = await this.jointBoxRepository.findOne({ where: { id } });
      if (!jointBox) throw new NotFoundException('Joint Box not found');
      return { lat: jointBox.location_lat, long: jointBox.location_long };
    } else if (type === FiberCableDestinationType.CUSTOMER) {
      const customer = await this.customerRepository.findOne({ where: { id } });
      if (!customer) throw new NotFoundException('Customer not found');
      return { lat: customer.location_lat, long: customer.location_long };
    }
    throw new Error('Invalid entity type');
  }

  // Trace fiber path from customer to POP
  async traceFiberPath(customerId: string): Promise<FiberTraceResult> {
    const path: FiberPathNode[] = [];
    let totalDistance = 0;
    let currentId = customerId;
    let currentType: FiberCableDestinationType | FiberCableSourceType = FiberCableDestinationType.CUSTOMER;

    // Start from customer
    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    path.push({
      id: customer.id,
      name: customer.name || `Customer ${customer.id}`,
      type: 'CUSTOMER',
      lat: customer.location_lat,
      long: customer.location_long,
    });

    let previousCoords = { lat: customer.location_lat, long: customer.location_long };

    // Trace backwards until we reach a POP
    while (currentType !== 'POP') {
      // Find cable where current entity is the destination
      const cable = await this.cableRepository.findOne({
        where: {
          destination_id: currentId,
          destination_type: currentType as FiberCableDestinationType,
        },
        relations: ['sourcePop', 'sourceJointBox'],
      });

      if (!cable) {
        // No cable found, try to find if this is a joint box connected to POP
        if (currentType === FiberCableDestinationType.JOINT_BOX) {
          const jointBox = await this.jointBoxRepository.findOne({
            where: { id: currentId },
            relations: ['pop'],
          });
          if (jointBox && jointBox.pop) {
            // Direct connection to POP
            const pop = jointBox.pop;
            const distance = this.calculateDistance(previousCoords, { lat: pop.location_lat, long: pop.location_long });
            totalDistance += distance;

            path.push({
              id: pop.id,
              name: pop.name,
              type: 'POP',
              lat: pop.location_lat,
              long: pop.location_long,
              distanceFromPrevious: distance,
            });
            break;
          }
        }
        throw new NotFoundException('Fiber path not found - no upstream connection');
      }

      // Add source to path
      let sourceName = '';
      let sourceLat = 0;
      let sourceLong = 0;
      let sourceId = '';

      if (cable.source_type === FiberCableSourceType.POP && cable.sourcePop) {
        sourceName = cable.sourcePop.name;
        sourceLat = cable.sourcePop.location_lat;
        sourceLong = cable.sourcePop.location_long;
        sourceId = cable.sourcePop.id;
        currentType = 'POP';
      } else if (cable.source_type === FiberCableSourceType.JOINT_BOX && cable.sourceJointBox) {
        sourceName = cable.sourceJointBox.name;
        sourceLat = cable.sourceJointBox.location_lat;
        sourceLong = cable.sourceJointBox.location_long;
        sourceId = cable.sourceJointBox.id;
        currentType = 'JOINT_BOX';
      }

      const distance = this.calculateDistance(previousCoords, { lat: sourceLat, long: sourceLong });
      totalDistance += distance;

      path.push({
        id: sourceId,
        name: sourceName,
        type: currentType as 'POP' | 'JOINT_BOX',
        lat: sourceLat,
        long: sourceLong,
        distanceFromPrevious: distance,
      });

      currentId = sourceId;
      previousCoords = { lat: sourceLat, long: sourceLong };
    }

    return {
      path: path.reverse(), // Reverse to show from POP to Customer
      totalDistanceMeters: totalDistance,
      totalHops: path.length - 1,
    };
  }

  // Get all POPs
  async getAllPops(): Promise<PopDevice[]> {
    return await this.popRepository.find();
  }

  // Get all joint boxes
  async getAllJointBoxes(): Promise<FiberJointBox[]> {
    return await this.jointBoxRepository.find({ relations: ['pop'] });
  }

  // Get all fiber cables
  async getAllFiberCables(): Promise<FiberCable[]> {
    return await this.cableRepository.find({
      relations: ['sourcePop', 'sourceJointBox', 'destinationPop', 'destinationJointBox'],
    });
  }

  // Get POP by ID
  async getPopById(id: string): Promise<PopDevice | null> {
    return await this.popRepository.findOne({ where: { id } });
  }

  // Get joint box by ID
  async getJointBoxById(id: string): Promise<FiberJointBox | null> {
    return await this.jointBoxRepository.findOne({ where: { id } });
  }

  // Get fiber cable by ID
  async getFiberCableById(id: string): Promise<FiberCable | null> {
    return await this.cableRepository.findOne({ where: { id } });
  }
}
