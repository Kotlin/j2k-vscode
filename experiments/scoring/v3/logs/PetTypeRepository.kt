package org.springframework.samples.petclinic.owner

import java.util.List
import java.util.Optional
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import jakarta.annotation.Nonnull

/**
 * Repository class for [PetType] domain objects.
 *
 * @author Patrick Baumgartner
 */
interface PetTypeRepository : JpaRepository<PetType, Int> {

    /**
     * Retrieve all [PetType]s from the data store.
     * @return a Collection of [PetType]s.
     */
    @Query("SELECT ptype FROM PetType ptype ORDER BY ptype.name")
    fun findPetTypes(): List<PetType>

}