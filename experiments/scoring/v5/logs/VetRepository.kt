
package org.springframework.samples.petclinic.vet

import org.springframework.cache.annotation.Cacheable
import org.springframework.dao.DataAccessException
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.repository.Repository
import org.springframework.transaction.annotation.Transactional

import java.util.Collection

/**
 * Repository class for Vet domain objects All method names are compliant
 * with Spring Data naming conventions so this interface can easily be extended for Spring
 * Data. See:
 * https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repositories.query-methods.query-creation
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 * @author Sam Brannen
 * @author Michael Isvy
 */
interface VetRepository : Repository<Vet, Integer> {

    /**
     * Retrieve all Vets from the data store.
     * @return a Collection of Vets
     */
    @Transactional(readOnly = true)
    @Cacheable("vets")
    @Throws(DataAccessException::class)
    fun findAll(): MutableCollection<Vet>

    /**
     * Retrieve all Vets from data store in Pages
     * @param pageable
     * @return
     * @throws DataAccessException
     */
    @Transactional(readOnly = true)
    @Cacheable("vets")
    @Throws(DataAccessException::class)
    fun findAll(pageable: Pageable): Page<Vet>
}
