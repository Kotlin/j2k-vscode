package org.springframework.samples.petclinic.owner

import java.util.Optional
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import jakarta.annotation.Nonnull

interface OwnerRepository : JpaRepository<Owner, Int> {

    fun findByLastNameStartingWith(lastName: String?, pageable: Pageable): Page<Owner>

    fun findById(id: @Nonnull Int?): Optional<Owner>
}