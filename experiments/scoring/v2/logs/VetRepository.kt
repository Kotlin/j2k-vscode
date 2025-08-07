package org.springframework.samples.petclinic.vet

import org.springframework.cache.annotation.Cacheable
import org.springframework.dao.DataAccessException
import org.springframework.data.domain.Page
import org.springframework.data.repository.Repository
import org.springframework.transaction.annotation.Transactional

open class VetRepository : Repository<Vet, Integer> {

    @Transactional(readOnly = true)
    @Cacheable("vets")
    fun findAll(): Collection<Vet>

    @Transactional(readOnly = true)
    @Cacheable("vets")
    fun findAll(pageable: Pageable): Page<Vet>
}