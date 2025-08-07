package org.springframework.samples.petclinic.owner

import java.util.List
import java.util.Optional
import jakarta.annotation.Nonnull
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository

interface OwnerRepository : JpaRepository<Owner, Integer> {
    fun findByLastNameStartingWith(lastName: String?, pageable: Pageable): Page<Owner>
    fun findById(id: @Nonnull Integer): Optional<Owner>
}