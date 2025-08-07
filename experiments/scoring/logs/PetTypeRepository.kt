package org.springframework.samples.petclinic.owner

import java.util.List
import java.util.Optional
import jakarta.annotation.Nonnull
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

/**
 * Repository class for <code>PetType</code> domain objects.
 *
 * @author Patrick Baumgartner
 */
public interface PetTypeRepository : JpaRepository<PetType, Integer> {

    /**
     * Retrieve all {@link PetType}s from the data store.
     * @return a Collection of {@link PetType}s.
     */
    @Query("SELECT ptype FROM PetType ptype ORDER BY ptype.name")
    fun findPetTypes(): List<PetType>

}